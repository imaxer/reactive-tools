import React from 'react';
import { useUpdateEffect } from 'react-use';
import { upperFirst } from 'lodash/fp';
import { Container, ContainerAllBeans } from './container';

export type TIocContainerFactoryProviderResult<
    Label extends string,
    ContextProviderProps extends Record<string, unknown> | undefined
    > = {
    [k in `${Capitalize<Label>}IocContextProvider`]: React.FC<
        React.PropsWithChildren<
            ContextProviderProps extends undefined ? {} : { contextProviderProps: ContextProviderProps }
            >
        >;
};

export type TIocContainerFactoryUseBeanResult<Label extends string, C extends Container<any, any>> = {
    [k in `use${Capitalize<Label>}Bean`]: <T extends ContainerAllBeans<C>, K extends keyof T>(beanName: K) => T[K];
};

export type TIocContainerFactoryChildFactoryResult<Label extends string, C extends Container<any, any>> = {
    [k in `create${Capitalize<Label>}ChildIocContainer`]: <
        ChildBeansContent extends Record<string, any>,
        ChildLabel extends string,
        ContextProviderProps extends Record<string, unknown> | undefined = undefined
        >(
        childContentFactory: (parent: C, props: ContextProviderProps) => ChildBeansContent,
        childLabel: ChildLabel
    ) => TIocContainerFactoryResult<ChildLabel, Container<ChildBeansContent, C>, ContextProviderProps>;
};

export type TIocContainerFactoryResult<
    Label extends string,
    C extends Container<any, any>,
    ContextProviderProps extends Record<string, unknown> | undefined
    > = TIocContainerFactoryProviderResult<Label, ContextProviderProps> &
    TIocContainerFactoryUseBeanResult<Label, C> &
    TIocContainerFactoryChildFactoryResult<Label, C>;

interface IBeansContentFactory<
    BeansContent extends Record<string, any>,
    Parent extends Container<any, any> = Container<{}>,
    ContextProviderProps extends Record<string, unknown> | undefined = undefined
    > {
    (parent: Parent, props: ContextProviderProps): BeansContent;
}

const ReactIocContext = React.createContext<Container<{}>>(new Container({}));

const useBean = <C extends Container<any, any>, T extends ContainerAllBeans<C>, K extends keyof T>(
    beanName: K
): T[K] => {
    const cont = React.useContext(ReactIocContext);
    return cont.get(beanName);
};

const createContextProvider = <
    BeansContent extends Record<string, any>,
    Parent extends Container<any, any> = Container<{}, Container<{}, undefined>>,
    ContextProviderProps extends Record<string, unknown> | undefined = undefined
    >(
    factory: (parent: Parent, props: ContextProviderProps) => Container<BeansContent, Parent>
) => {
    return React.memo<React.PropsWithChildren<{ contextProviderProps: ContextProviderProps }>>(
        ({ contextProviderProps, children }) => {
            const parentContextContainer = React.useContext(ReactIocContext) as Parent;

            const [providerContainer, setProviderContainer] = React.useState(
                factory(parentContextContainer, contextProviderProps)
            );

            React.useEffect(() => {
                return () => {
                    providerContainer.dispose();
                };
            }, [providerContainer]);

            useUpdateEffect(() => {
                setProviderContainer(factory(parentContextContainer, contextProviderProps));
            }, [parentContextContainer, contextProviderProps]);

            return <ReactIocContext.Provider value={providerContainer}>{children}</ReactIocContext.Provider>;
        }
    );
};

export const createIocContainer = <
    BeansContent extends Record<string, any>,
    Label extends string,
    Parent extends Container<any, any> = Container<{}, Container<{}, undefined>>,
    ContextProviderProps extends Record<string, unknown> | undefined = undefined
    >(
    content: BeansContent | IBeansContentFactory<BeansContent, Parent, ContextProviderProps>,
    label: Label
): TIocContainerFactoryResult<Label, Container<BeansContent, Parent>, ContextProviderProps> => {
    const outLabel = upperFirst(label) as Capitalize<Label>;
    const contextProvideName: `${Capitalize<Label>}IocContextProvider` = `${outLabel}IocContextProvider`;

    const factory = (parent: Parent, props: ContextProviderProps) =>
        new Container(typeof content === 'function' ? content(parent, props) : content, parent);

    const ContextProvider: React.FC<React.PropsWithChildren<{ contextProviderProps: ContextProviderProps }>> =
        createContextProvider(factory);

    ContextProvider.displayName = contextProvideName;

    return {
        [contextProvideName]: ContextProvider,
        [`use${outLabel}Bean`]: useBean,
        [`create${outLabel}ChildIocContainer`]: createIocContainer,
    } as TIocContainerFactoryResult<Label, Container<BeansContent, Parent>, ContextProviderProps>;
};
