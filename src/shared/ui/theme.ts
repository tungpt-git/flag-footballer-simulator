export const THEME_STORAGE_KEY = "ffl-theme";

/** Runs before first paint so there is no theme flash. Dark is the default. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.classList.add("dark")}`;
