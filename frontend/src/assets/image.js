// Every image the portal uses, imported once here so components never hard-code file paths
import logo192 from './images/ask_eva_logo_192.png';
import logoFull from './images/ask_eva_logo.png';

export const IMAGES = {
  logo: logo192,       // sidebar, login card, mobile bar
  logoFull,            // fallback when the small logo fails to load
};

export default IMAGES;
