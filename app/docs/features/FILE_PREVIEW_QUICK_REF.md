# 📄 FILE PREVIEW - QUICK REFERENCE

## ✅ **SUPPORTED FILE TYPES**

### **Images** 🖼️
`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`
- ✅ Zoom (25%-300%)
- ✅ Rotate (90°)
- ✅ Fullscreen
- ✅ Reset / Download

### **Videos** 🎥
`.mp4`, `.webm`, `.ogg`, `.mov`
- ✅ HTML5 Player
- ✅ Auto-play
- ✅ Fullscreen
- ✅ Download

### **PDF** 📕
`.pdf`
- ✅ Browser viewer
- ✅ Native controls
- ✅ Download

### **Text & Code (Monaco Editor)** 📝 ⭐ NEW
`.txt`, `.md`, `.log`, `.json`, `.xml`, `.csv`, `.yaml`, `.yml`, `.env`, `.ini`, `.conf`
`.js`, `.ts`, `.tsx`, `.jsx`, `.css`, `.html`, `.php`, `.py`, `.java`, `.c`, `.cpp`, `.h`, `.sql`, `.sh`, `.gitignore`, `Dockerfile`, `Makefile`
- ✅ **Syntax Highlighting** (Monaco)
- ✅ **Direct Editing** (Direct Save)
- ✅ **Search (Ctrl+F)**
- ✅ **Loading Skeletons**
- ✅ Fullscreen / Download

---

## 🧪 **QUICK TEST**

### **1. Image**:
```
1. Click Preview (🔗) on .jpg file
2. Verify: zoom, rotate, fullscreen work
3. Click Download, then Close (X)
```

### **2. Video**:
```
1. Click Preview on .mp4 file  
2. Verify: auto-plays, controls work
```

### **3. PDF**:
```
1. Click Preview on .pdf file
2. Verify: Native PDF controls appear
```

### **4. Text Edit** ⭐:
```
1. Click Edit Content (📝) on .txt or .env file
2. Change text -> Click Save Changes
3. Verify Success notification
4. Reload to verify content saved
```

---

## 📊 **ACTION BUTTONS**

**1. Preview Button**
- **Icon**: ExternalLink (🔗)  
- **Action**: Opens file in read-only preview mode.

**2. Edit Content Button**
- **Icon**: FileEdit (📝)  
- **Action**: Opens file directly in Monaco Editor for editing.

---

## ✅ **CHECKLIST**

File Preview/Editor Testing:
- [ ] Syntax highlighting works (JS/PHP/SQL)
- [ ] Save changes to server works
- [ ] "Edit Content" button opens editor directly
- [ ] Fullscreen works for all types
- [ ] Download works from preview/editor
- [ ] Success toast appears on Save

---

## 🔧 **TROUBLESHOOTING**

**Edit button missing?**
- Check file extension (now supports 40+)
- Check user role (viewers cannot edit)

**Save failed?**
- Check server log
- Verify SFTP permissions
- Check internet connection

---

**Status**: ✅ PRODUCTION READY (v3.1.0)  
**Main Docs**: `FILE_PREVIEW_FEATURE.md`
