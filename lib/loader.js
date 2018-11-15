const path = require('path');
const fs = require('fs');

class Loader {

    constructor(options = {}) {
        this.options = options;
        this.logger = this.options.logger;
    }

    lodeFile(filepath){
        if (!filepath || !fs.existsSync(filepath)) {
            this.logger.warn('load undefined file');
            return null;
        }

        this.logger.debug(`load file : ${filepath}`);
        try {
            let ext = path.extname(filepath);
            if (ext && !require.extensions[ext]) {
                return fs.readFileSync(filepath);
            }
            const obj = require(filepath);
            return obj;
        } catch (err) {
            this.logger.error(`load file -- ${filepath} , error: ${err.message}`);
            throw err;
        }
    }

}

module.exports = Loader;