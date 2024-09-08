
/***************************************************
 ************* Reflexion model stuff ***************
 ***************************************************/

export type FileDependencyMap = {
    dependencies: {
      [filename: string]: string[];
    };
  };

export type ModuleName = string;
export type FilePathStr = string;

export type ModulesDefinition = {
  moduleMapping: { [moduleName: ModuleName]: FilePathStr[] };
};

export type ModuleGraph = {
  [moduleName: ModuleName]: ModuleName[];
};

export type ReflexionModel = {
  moduleGraph: ModuleGraph;
  modulesDefinition: ModulesDefinition;
};