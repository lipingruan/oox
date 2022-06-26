


export class ModuleConfig {
    [x: string]: any
    disabled = false
}



export default class Module {
    [x: string]: any

    config: ModuleConfig

    name: string

    setConfig ( config:any ) { }

    getConfig ( ): ModuleConfig { return this.config }

    async serve ( ) { }

    async stop ( ) { }
}