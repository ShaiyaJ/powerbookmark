window.onload = () => {
    const THEME_SELECT = document.getElementById("theme");
    
    PBMState.update().then(_ => {
        THEME_SELECT.value = PBMState.config.theme;
    });
    
    THEME_SELECT.oninput = _ => {
        PBMState.setConfigTheme(THEME_SELECT.value);
        PBMState.save();
        updateCSS();
    }
}
