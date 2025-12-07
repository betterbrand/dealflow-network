declare module 'react-cytoscapejs' {
  import { Component } from 'react';
  import cytoscape from 'cytoscape';

  interface CytoscapeComponentProps {
    elements: any[];
    style?: React.CSSProperties;
    stylesheet?: any[];
    layout?: any;
    cy?: (cy: cytoscape.Core) => void;
    wheelSensitivity?: number;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}

declare module 'cytoscape-cola' {
  import cytoscape from 'cytoscape';
  const cola: cytoscape.Ext;
  export default cola;
}

declare module 'cytoscape-popper' {
  import cytoscape from 'cytoscape';
  const popper: cytoscape.Ext;
  export default popper;
}

declare module 'cytoscape-context-menus' {
  import cytoscape from 'cytoscape';
  const contextMenus: cytoscape.Ext;
  export default contextMenus;
}
