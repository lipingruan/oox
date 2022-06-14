


export class ModuleConfig {
    disabled = false
}



export default class Module {

    config: ModuleConfig

    name: string

    setConfig ( config:any ) { }

    getConfig ( ): ModuleConfig { return this.config }

    async serve ( ) { }

    async stop ( ) { }
}