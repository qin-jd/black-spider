const log4js = require('log4js');
const Scheduler = require('./scheduler');

class App {
    /**
     * @constructor
     * @param options
     */
    constructor(options = {}) {

        this.config = {
            'LOG_LEVEL' : 'debug',
            'DOWNLOAD_TIMEOUT' : 10,
            'MAX_REQUEST' : 10,
        }

        Object.assign(this.config , options.config);

        this.logger = log4js.getLogger('[App]');
        this.logger.level = this.config.LOG_LEVEL;
        this.logger.info('**************** start app ****************');

        this.scheduler = new Scheduler({
            app : this,
            spider : options.spider
        });
    }

    start(tasks){
        this.scheduler.init(tasks);
    }
}

module.exports = App;