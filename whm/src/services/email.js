const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const send2FAEmail = (user, code, siteSettings, req = null) => {
    const siteTitle = siteSettings.site_title || 'Yumna Panel';
    const footerText = siteSettings.footer_text || 'Advanced Hosting & Server Control Panel';
    const logoUrl = siteSettings.logo_url;
    const brandColor = siteSettings.primary_color || '#072e07ff'; // Default green if not set

    // Audit information
    const timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'medium'
    });
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim() : 'IP Terproteksi';

    return transporter.sendMail({
        from: process.env.SMTP_FROM || `"${siteTitle} Security" <noreply@rs-simdep.com>`,
        to: user.email,
        subject: `🔐 Kode Verifikasi Keamanan - ${siteTitle}`,
        html: `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>${siteTitle}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; color: #1a202c;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 100%; max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                                <tr>
                                    <td style="background: ${brandColor}; padding: 32px; text-align: center;">
                                        ${logoUrl ? `<img src="${logoUrl}" alt="${siteTitle}" style="max-height: 60px; margin-bottom: 16px; display: inline-block;">` : ''}
                                        <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px; font-weight: 700;">KEAMANAN SISTEM</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 48px 40px;">
                                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Yth. Bpk/Ibu <strong>${user.username}</strong>,</p>
                                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                                            Kami mendeteksi aktivitas penandaan masuk (login) ke akun Anda. Demi keamanan, silakan gunakan kode otentikasi dua faktor (2FA) berikut untuk melanjutkan:
                                        </p>
                                        
                                        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                                            <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: ${brandColor}; font-family: monospace;">${code}</span>
                                        </div>
                                        
                                        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #dc2626;">PENTING:</p>
                                        <ul style="margin: 0 0 32px; padding-left: 20px; font-size: 14px; line-height: 1.5; color: #4a5568;">
                                            <li>Kode ini berlaku selama <strong>2 menit</strong>.</li>
                                            <li>Jangan berikan kode ini kepada siapapun (termasuk tim IT/Admin).</li>
                                            <li>Sistem kami tidak pernah meminta kode melalui telepon/pesan teks.</li>
                                        </ul>
                                        
                                        <div style="border-top: 1px solid #edf2f7; padding-top: 24px; margin-top: 24px;">
                                            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Informasi Audit Keamanan:</p>
                                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                                Waktu Permintaan: ${timestamp}<br>
                                                Alamat IP: ${ipAddress}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 32px 40px; background: #f8fafc; border-top: 1px solid #edf2f7;">
                                        <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #64748b;">
                                            Jika Anda tidak merasa melakukan permintaan ini, mohon segera hubungi IT Helpdesk atau ubah kata sandi Anda melalui portal resmi.
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                            ISO/IEC 27001 Certified Content - Pesan ini dienkripsi dan dihasilkan secara otomatis.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center;">
                                &copy; ${new Date().getFullYear()} ${siteTitle} &bull; ${footerText}
                            </p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    });
};

module.exports = { send2FAEmail };
