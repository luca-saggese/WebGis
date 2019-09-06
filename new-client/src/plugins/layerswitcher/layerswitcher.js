import React from "react";
import { withStyles } from "@material-ui/core/styles";
import BaseWindowPlugin from "../BaseWindowPlugin";

import LayersIcon from "@material-ui/icons/Layers";

import LayerSwitcherView from "./LayerSwitcherView.js";
import LayerSwitcherModel from "./LayerSwitcherModel.js";
import Observer from "react-event-observer";

const styles = theme => {
  return {};
};

class LayerSwitcher extends React.PureComponent {
  constructor(props) {
    super(props);

    this.localObserver = Observer();
    // this.localObserver.subscribe("layerAdded", layer => {});

    this.layerSwitcherModel = new LayerSwitcherModel({
      map: props.map,
      app: props.app,
      observer: this.localObserver
    });
  }

  render() {
    return (
      <BaseWindowPlugin
        {...this.props}
        custom={{
          icon: <LayersIcon />,
          title: "Visa",
          description: "Välj vad du vill se i kartan",
          height: "auto",
          width: "400px",
          top: undefined, // Will default to BaseWindowPlugin's top/left
          left: undefined
        }}
      >
        <LayerSwitcherView
          app={this.props.app}
          map={this.props.map}
          model={this.layerSwitcherModel}
          observer={this.localObserver}
          breadCrumbs={this.props.type === "widgetItem"}
        />
      </BaseWindowPlugin>
    );
  }
}

export default withStyles(styles)(LayerSwitcher);
