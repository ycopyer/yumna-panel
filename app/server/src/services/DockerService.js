const Docker = require('dockerode');
const fs = require('fs');

class DockerService {
    constructor() {
        // Auto-detect socket path based on OS or Environment Variable
        const socketPath = process.env.DOCKER_SOCKET_PATH || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');

        try {
            this.docker = new Docker({ socketPath });
        } catch (error) {
            console.error('Failed to initialize DockerService:', error.message);
            this.docker = null;
        }
    }

    async isDockerAvailable() {
        if (!this.docker) return false;
        try {
            await this.docker.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    async getContainers(all = true) {
        if (!this.docker) {
            console.warn('[DOCKER] Docker engine not connected');
            return [];
        }
        try {
            const containers = await this.docker.listContainers({ all });
            return containers.map(c => ({
                id: c.Id,
                names: c.Names,
                image: c.Image,
                state: c.State,
                status: c.Status,
                ports: c.Ports,
                created: c.Created
            }));
        } catch (error) {
            console.error('[DOCKER] listContainers error:', error.message);
            // Return empty array instead of throwing - Docker might not be running
            return [];
        }
    }

    async getContainer(id) {
        if (!this.docker) throw new Error('Docker engine not connected');
        const container = this.docker.getContainer(id);
        const data = await container.inspect();
        return data;
    }

    async startContainer(id) {
        if (!this.docker) throw new Error('Docker engine not connected');
        const container = this.docker.getContainer(id);
        await container.start();
        return { message: 'Container started' };
    }

    async stopContainer(id) {
        if (!this.docker) throw new Error('Docker engine not connected');
        const container = this.docker.getContainer(id);
        await container.stop();
        return { message: 'Container stopped' };
    }

    async restartContainer(id) {
        if (!this.docker) throw new Error('Docker engine not connected');
        const container = this.docker.getContainer(id);
        await container.restart();
        return { message: 'Container restarted' };
    }

    async createContainer({ name, image, ports, env }) {
        if (!this.docker) throw new Error('Docker engine not connected');

        // Prepare PortBindings and ExposedPorts
        // ports input format: [{ host: 8080, container: 80 }]
        const ExposedPorts = {};
        const PortBindings = {};

        if (ports && Array.isArray(ports)) {
            ports.forEach(p => {
                const containerPort = `${p.container}/tcp`;
                ExposedPorts[containerPort] = {};
                PortBindings[containerPort] = [{ HostPort: `${p.host}` }];
            });
        }

        // Prepare Env
        // env input format: [{ key: 'FOO', value: 'BAR' }]
        const Env = env && Array.isArray(env) ? env.map(e => `${e.key}=${e.value}`) : [];

        try {
            // Try to create
            const container = await this.docker.createContainer({
                Image: image,
                name: name,
                ExposedPorts,
                HostConfig: {
                    PortBindings,
                    RestartPolicy: { Name: 'unless-stopped' }
                },
                Env
            });

            await container.start();
            return { message: 'Container created and started', id: container.id };
        } catch (error) {
            // If image not found (404), try to pull first
            if (error.statusCode === 404 && error.message.includes('No such image')) {
                console.log(`Image ${image} not found locally, pulling...`);
                await new Promise((resolve, reject) => {
                    this.docker.pull(image, (err, stream) => {
                        if (err) return reject(err);
                        this.docker.modem.followProgress(stream, onFinished, onProgress);
                        function onFinished(err, output) {
                            if (err) return reject(err);
                            resolve(output);
                        }
                        function onProgress(event) {
                            // console.log(event);
                        }
                    });
                });

                // Retry create
                const container = await this.docker.createContainer({
                    Image: image,
                    name: name,
                    ExposedPorts,
                    HostConfig: {
                        PortBindings,
                        RestartPolicy: { Name: 'unless-stopped' }
                    },
                    Env
                });
                await container.start();
                return { message: 'Container created and started (after pull)', id: container.id };
            } else {
                throw error;
            }
        }
    }

    async removeContainer(id) {
        if (!this.docker) throw new Error('Docker engine not connected');
        const container = this.docker.getContainer(id);
        await container.remove({ force: true });
        return { message: 'Container removed' };
    }

    async getContainerLogs(id, tail = 100) {
        if (!this.docker) throw new Error('Docker engine not connected');
        const container = this.docker.getContainer(id);
        const logs = await container.logs({
            follow: false,
            stdout: true,
            stderr: true,
            tail
        });
        // Logs are binary, need simple decoding (dockerode returns Buffer usually with header)
        // Docker stream format: [8 bytes header] [payload]
        // This simple string conversion might include garbage characters from headers.
        // For a proper implementation, we should parse the demuxed stream.
        // But for "simple" logs, toString('utf8') often works "okay-ish" but shows header bytes.
        // Let's try a simple cleanup regex or just return text for now.
        return logs.toString('utf8').replace(/[^\x20-\x7E\n\r]/g, ''); // Basic cleanup
    }
}

module.exports = new DockerService();
