import "../scss/app.scss";
import {getNotes} from "./api.js";
import {attachListeners} from "./dom.js";

attachListeners();
getNotes();
