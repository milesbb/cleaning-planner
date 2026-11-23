import en from 'zod/v4/locales/en.js';
import * as zodApi from './zod-api';

zodApi.config(en());

export { zodApi as z };
