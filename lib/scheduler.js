const pm2 = require('pm2');
const path = require('path');
const { EventEmitter } = require('events');

class Scheduler extends EventEmitter{
    constructor(options = {}){
        super();
        this.options = options;
        this.app = this.options.app;
        this.worker = [];
    }

    start(options = {}){
        return new Promise((resolve, reject) => {
            pm2.start(options , (err, apps) => {
                if (err) {
                    reject(err);
                }
                resolve(apps);
            });
        });
    }

    init(tasks){
        var max = tasks.length > this.app.config.MAX_REQUEST ? this.app.config.MAX_REQUEST : tasks.length;

        pm2.connect(async (err) =>{
            if (err) {
                this.app.logger.debug(`pm2 connect error : ${err} `);
                process.exit(0)
            }

            while (max--){
                let name = `task_${max}_${Math.round(new Date().getTime()/1000)}`;
                await this.start({
                    script: path.join(__dirname , 'task.js'),
                    name:name
                }).then((apps) => {
                    this.worker.push({
                        name : apps[0].pm2_env.name,
                        pm_id : apps[0].pm2_env.pm_id
                    })
                    this.app.logger.debug(`pm2 start process : ${name} , status : success`);
                });
            }

            this.emit('ready');

            this.distribute(tasks);

            this.listen();
        });

    }

    distribute(tasks = []){
        const number = this.worker.length;
        pm2.connect(async (err) =>{
            if (err) {
                this.app.logger.debug(`pm2 connect error : ${err} `);
                process.exit(1)
            }

            for (let pro of this.worker){
                pm2.sendDataToProcessId({
                    type: 'process:msg',
                    data: {
                        urls : tasks.splice(0 , Math.ceil(tasks.length/number)),
                        spider: this.options.spider,
                        config : this.app.config,
                    },
                    id: pro.pm_id,
                    name: pro.name,
                    topic: 'start'
                }, (err, res) => {
                })
            }
        });
    }

    listen(){
        pm2.launchBus((err, bus) => {
            bus.on('process:msg', (packet) => {
                if(packet.data.end) {
                    pm2.delete(packet.data.name , ()=>{
                        this.worker.splice(this.worker.findIndex(item => item.name === packet.data.name), 1);
                        if (this.worker.length == 0) {
                            //爬虫任务结束
                            this.app.logger.info('all worker end,exit process');
                            process.exit(0);
                        }
                    });
                }
                else{
                    this.app.logger[packet.data.type](packet.data.msg);
                }
            })
        })
    }

}


module.exports = Scheduler;