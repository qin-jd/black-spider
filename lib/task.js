const request = require('request');
const Loader = require('./loader');

class Task {
    constructor(options={}){
        this.options = options;
        this.name = this.options.name;
        this.urls = this.options.urls;
        this.config = this.options.config;
        this.loader = new Loader({logger : this.logger});

    }

    async start(){
        const Crawler = this.loader.lodeFile(this.options.spider);
        let crawler = new Crawler({logger : this.logger});
        crawler.request();
        crawler.use(this.downloader);
        crawler.response();
        let fn = crawler.callback();

        for(let url of this.urls){
            let v = await fn({
                logger : this.logger,
                header : {
                    url : url,
                    timeout:this.config.DOWNLOAD_TIMEOUT,
                },
                response : {}
            }).catch((error)=>{
                this.logger.error(error);
            });


            if(v === false){
                this.urls.push(url);
            }else{
                if(v&&v.length>0){
                    this.urls = this.urls.concat(v);
                }
            }

        }

        this.logger.info(`**************** task[${this.name}] end ****************`);
        //关闭pm2进程

        process.send({
            type: 'process:msg',
            data: {
                end : true,
                name : this.name
            }
        })

    }

    _logger(type='debug' , msg=''){
        process.send({
            type: 'process:msg',
            data: {
                type : type,
                msg : `[${this.name}] ${msg}`
            }
        })
    }

    get logger(){
        return {
            trace : (msg)=>{this._logger('trace' , msg)},
            debug :(msg)=>{this._logger('debug' , msg)},
            info : (msg)=>{this._logger('info' , msg)},
            warn : (msg)=>{this._logger('warn' , msg)},
            error : (msg)=>{this._logger('error' , msg)},
            fatal : (msg)=>{this._logger('fatal' , msg)}
        }
    }

    async downloader(ctx , next){
        ctx.logger.debug('download url : ' + ctx.header.url + (ctx.header.proxy ? ' ---- proxy : '+ctx.header.proxy : ''));

        var promiseObj = new Promise(function(resolve, reject) {
            request(ctx.header, function (error, response, body) {
                if(response){
                    resolve(response);
                }else{
                    reject(error);
                }
            });

            //因为request模块一旦加上proxy 设置timeout就没什么卵用 如果超时没有成功即做错误处理
            setTimeout(function(){
                reject('timeout');
            },ctx.header.timeout);

            // reject('timeout');
        });

        await promiseObj.then(async (response)=>{
            ctx.logger.debug('download status : ' + response.statusCode);
            if (response.statusCode == 200) {
                ctx.response = response;
                await next();
            } else {
                throw new Error('302');
            }
        }).catch(async (error)=>{
            ctx.response = 'downloadError';
            await next();
            ctx.logger.debug('download error : ' + error);
        })
    }

}

process.on('message', (packet) => {
    new Task({
        urls : packet.data.urls,
        spider : packet.data.spider,
        config : packet.data.config,
        name : packet.name,
    }).start();
})


