window.onload = () => {
    const THEME_SELECT = document.getElementById("theme");
    
    const BACKUP = document.getElementById("backup");
    const BACKUP_COPY = document.getElementById("backup-copy");
    const BACKUP_SET = document.getElementById("backup-set");
    
    PBMState.update().then(_ => {
        THEME_SELECT.value = PBMState.config.theme;
        BACKUP.value = JSON.stringify(PBMState.urls);
    });
    
    THEME_SELECT.oninput = _ => {
        PBMState.setConfigTheme(THEME_SELECT.value);
        PBMState.save();
        updateCSS();
    }
    
    BACKUP_COPY.onclick = _ => {
        navigator.clipboard.writeText(BACKUP.value);
        alert("Copied!");
    }
    
    BACKUP_SET.onclick = _ => {
        try {
            PBMState.urls = JSON.parse(BACKUP.value);
        } catch (err) {
            alert("Invalid JSON");
            return;
        }
        
        PBMState.save();
        alert("Overriden!");
    }
}
