const compose = require('koa-compose');

class Spider{
    /**
     * @constructor
     * @param options
     */
    constructor(options = {}) {
        this.options = options;
        this.middleware = [];
        this.logger = this.options.logger;
    }

    use(fn){
        if(typeof fn !== 'function')
            throw new TypeError('middleware must be a function!');

        // this.logger.debug(`use middleware : ${fn._name || fn.name || '-'}`);
        this.middleware.push(fn);
        return this;
    }

    callback(){
        return compose(this.middleware);
    }

}

module.exports = Spider;