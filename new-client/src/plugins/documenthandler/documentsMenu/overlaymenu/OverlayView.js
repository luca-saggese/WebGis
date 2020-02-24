import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import HeaderView from "../HeaderView";
import Modal from "@material-ui/core/Modal";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import _OverlayMenuView from "./OverlayMenuView";
import menuViewHoc from "../MenuViewHOC";

var OverlayMenuView = menuViewHoc(_OverlayMenuView);

const styles = theme => ({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    outline: "none",
    minHeight: "80%",
    marginTop: "5%",
    marginBottom: "5%",
    [theme.breakpoints.down("xs")]: {
      height: "100%",
      overflow: "scroll",
      marginTop: 0,
      marginBottom: 0
    }
  }
});

const fullWidth = 12;
const mapDiv = document.getElementById("map");

class OverlayView extends React.PureComponent {
  state = {
    open: true
  };

  static propTypes = {};
  static defaultProps = {};

  handleMapBlur = () => {
    if (this.state.open) {
      mapDiv.setAttribute("style", "filter : blur(7px)");
    } else {
      mapDiv.removeAttribute("style", "filter : blur(7px)");
    }
  };

  close = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes, localObserver, activeMenuSection } = this.props;
    this.handleMapBlur();

    return (
      <>
        <Modal
          className={classes.modal}
          onBackdropClick={this.close}
          open={this.state.open}
        >
          <Container className={classes.container} fixed>
            <Grid zeroMinWidth item xs={fullWidth}>
              <HeaderView
                activeMenuSection={activeMenuSection}
                localObserver={localObserver}
              ></HeaderView>
            </Grid>
            <Grid container>
              <OverlayMenuView
                activeMenuSection={activeMenuSection}
                localObserver={localObserver}
              ></OverlayMenuView>
            </Grid>
          </Container>
        </Modal>
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(OverlayView));
