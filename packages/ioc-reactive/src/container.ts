export type ContainerParent<C> = C extends Container<any, infer Parent> ? Parent : never;

export type ContainerContent<C> = C extends Container<infer Content, any> ? Content : never;

export type ContainerAllBeans<C, ExternalBeans = undefined> = C extends Container<
        infer BeansContent,
        infer ParentContainer
        >
    ? ParentContainer extends Container<{}, undefined>
        ? ExternalBeans extends undefined
            ? BeansContent
            : Omit<BeansContent, keyof ExternalBeans>
        : (ExternalBeans extends undefined ? BeansContent : Omit<BeansContent, keyof ExternalBeans>) &
        ContainerAllBeans<
            ParentContainer,
            ExternalBeans extends undefined ? BeansContent : BeansContent & ExternalBeans
            >
    : never;

export type ContainerAllContentByArg<C, P extends Container<any, any> | undefined> = ContainerAllBeans<Container<C, P>>;

export class Container<
    BeansContent extends Record<string | number | symbol, any>,
    ParentContainer extends Container<any, any> | undefined = Container<{}, undefined>
    > {
    constructor(private readonly content: BeansContent, private readonly parent?: ParentContainer) {
        this.get = this.get.bind(this);
    }

    get<AllBeans extends ContainerAllContentByArg<BeansContent, ParentContainer>, BeanName extends keyof AllBeans>(
        beanName: BeanName
    ): AllBeans[BeanName] | never {
        if (beanName in this.content) {
            return this.content[beanName];
        }
        if (this.parent) {
            return this.parent.get(beanName);
        }
        throw new Error(`bean ${beanName} is not exist in container`);
    }

    dispose(): void {
        console.log('Dispose', this.content);
        // todo: notify all disposable interfaces
    }
}
