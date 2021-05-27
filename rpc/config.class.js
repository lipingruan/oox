
module.exports = class Config {



    /**
     * 服务名称
     */
    name = ''



    /**
     * 主机地址列表
     */
    host = ''



    /**
     * 跨域处理
     */
    origin = null



    /**
     * 网关地址
     */
    gateway = {



        /**
         * http 网关地址
         * @type {{port:Number,path:String}}
         */
        http: null,



        /**
         * socketio 网关地址
         * @type {{port:Number,path:String}}
         */
        socketio: null
    }
}