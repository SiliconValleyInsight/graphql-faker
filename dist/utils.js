"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
function existsSync(filePath) {
    try {
        fs.statSync(filePath);
    }
    catch (err) {
        if (err.code == 'ENOENT')
            return false;
    }
    return true;
}
exports.existsSync = existsSync;
;
//# sourceMappingURL=utils.js.map