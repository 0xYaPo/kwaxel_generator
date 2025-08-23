import { ComponentCompilerMeta } from '@stencil/core/internal';
import { Project } from 'ts-morph';

export declare const createEsModulesComponentsFile: ({ components, project, outDir, }: {
    components: ComponentCompilerMeta[];
    project?: Project;
    outDir?: string;
}) => Promise<import('ts-morph').SourceFile>;
