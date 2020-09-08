import React from "react";
import cslx from "clsx";
import { withStyles } from "@material-ui/core/styles";
import { Vector as VectorLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import { Stroke, Style, Circle, Fill } from "ol/style";
import Grid from "@material-ui/core/Grid";
import { FormHelperText } from "@material-ui/core";

import ClearIcon from "@material-ui/icons/Clear";
import GeoJSON from "ol/format/GeoJSON";

import {
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Checkbox,
  Popover,
  Typography,
} from "@material-ui/core";

import Autocomplete from "@material-ui/lab/Autocomplete";
import ToggleButton from "@material-ui/lab/ToggleButton";

import FormatSizeIcon from "@material-ui/icons/FormatSize";
import SearchIcon from "@material-ui/icons/Search";
import BrushTwoToneIcon from "@material-ui/icons/BrushTwoTone";
import WithinIcon from "@material-ui/icons/Adjust";
import IntersectsIcon from "@material-ui/icons/Toll";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import RoomIcon from "@material-ui/icons/Room";
import DescriptionIcon from "@material-ui/icons/Description";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import PlaylistAddCheckIcon from "@material-ui/icons/PlaylistAddCheck";
import SearchResultsContainer from "./SearchResultsContainer";

const styles = (theme) => ({
  searchContainer: {
    width: 400,
    height: theme.spacing(6),
  },
  searchCollapsed: {
    left: -440,
  },
  inputRoot: {
    height: theme.spacing(6),
  },
  hidden: {
    display: "none",
  },
});

let drawStyle = new Style({
  stroke: new Stroke({
    color: "rgba(255, 214, 91, 0.6)",
    width: 4,
  }),
  fill: new Fill({
    color: "rgba(255, 214, 91, 0.2)",
  }),
  image: new Circle({
    radius: 6,
    stroke: new Stroke({
      color: "rgba(255, 214, 91, 0.6)",
      width: 2,
    }),
  }),
});

class SearchBar extends React.PureComponent {
  constructor(props) {
    super(props);
    this.map = props.map;
    this.searchModel = props.app.appModel.searchModel;
    this.drawSource = new VectorSource({ wrapX: false });
    this.drawLayer = new VectorLayer({
      source: this.drawSource,
      style: drawStyle,
    });
    this.resultsSource = new VectorSource({ wrapX: false });
    this.resultsLayer = new VectorLayer({
      source: this.resultsSource,
      style: null,
    });
    this.map.addLayer(this.drawLayer);
    this.map.addLayer(this.resultsLayer);
  }

  state = {
    autoCompleteOpen: false,
    autoCompleteOptions: [],
    loading: false,
    wildcardAtStart: false,
    wildcardAtEnd: true,
    matchCase: false,
    activeSpatialFilter: "intersects",
    drawActive: false,
    panelCollapsed: false,
    searchString: "",
    searchSources: [],
    searchResults: { featureCollections: [], errors: [] },
    anchorEl: undefined,
    moreOptionsId: undefined,
    moreOptionsOpen: false,
    selectSourcesOpen: false,
    autocompleteList: [],
    resultPanelCollapsed: false,
    showSearchResults: false,
  };

  /**
   * @summary Triggered when user selects a value/presses [Enter]. Makes a call and gets the actual search results.
   *
   * @param {Object} event
   * @param {String} value
   * @param {String} reason
   */
  handleOnChange = (event, value, reason) => {
    let searchString = value?.autocompleteEntry || value || "";
    // "value" can be String (if freeSolo) or Object (if autocomplete entry selected)
    // We must ensure that we grab the string either way.
    this.setState(
      {
        searchString: searchString,
        autoCompleteOpen: false,
      },
      () => {
        if (this.state.searchString.length >= 3) {
          this.doSearch();
        }
      }
    );
  };

  /**
   * @summary Triggered each time user changes input field value (e.g. onKeyPress etc). Makes a call to get the autocomplete list.
   *
   * @param {Object} event
   * @param {String} value
   * @param {String} reason
   */
  handleOnInputChange = (event, searchString, reason) => {
    this.resultsSource.clear();
    this.setState(
      {
        autoCompleteOpen: searchString.length >= 3,
        loading:
          searchString.length >= 3 && this.state.autocompleteList.length === 0,
        showSearchResults: false,
        searchString: searchString,
      },
      () => {
        if (this.state.searchString.length >= 3) {
          this.updateAutoCompleteList(this.state.searchString);
        } else {
          this.setState({
            autocompleteList: [],
          });
        }
      }
    );
  };

  handleClickOnMoreOptions = (event) => {
    this.setState({
      anchorEl: event.currentTarget,
    });
  };

  handleClickOnSearch = () => {
    this.doSearch();
  };

  flattenAndSortAutoCompleteList = (searchResults) => {
    const resultsPerDataset = searchResults.featureCollections.map(
      (featureCollection) => {
        return featureCollection.value.features.map((feature) => {
          // TODO: We should add another property in admin that'll decide which FIELD (and it should
          // be one (1) field only) should be used for Autocomplete.
          // There's a huge problem with the previous approach (mapping displayFields and using that
          // in Autocomplete) because __there will never be a match in on searchField if the search
          // string consists of values that have been stitched together from multiple fields__!
          const autocompleteEntry =
            feature.properties[featureCollection.source.searchFields[0]];
          // Let's provide a name for each dataset, so it can be displayed nicely to the user.
          const dataset = featureCollection.source.caption;
          const origin = featureCollection.origin;
          return {
            dataset,
            autocompleteEntry,
            origin: origin,
          };
        });
      }
    );
    // Now we have an Array of Arrays, one per dataset. For the Autocomplete component
    // however, we need just one Array, so let's flatten the results:
    const flatAutocompleteArray = resultsPerDataset.reduce(
      (a, b) => a.concat(b),
      []
    );
    return flatAutocompleteArray.sort((a, b) =>
      a.autocompleteEntry.localeCompare(b.autocompleteEntry, "sv", {
        numeric: true,
      })
    );
  };

  removeCollectionsWithoutFeatures = (searchResults) => {
    for (let i = searchResults.featureCollections.length - 1; i >= 0; i--) {
      if (searchResults.featureCollections[i].value.features.length === 0) {
        searchResults.featureCollections.splice(i, 1);
      }
    }
    return searchResults;
  };

  prepareAutoCompleteList = (searchResults) => {
    const cleanedResults = this.removeCollectionsWithoutFeatures(searchResults);
    let numSourcesWithResults = cleanedResults.featureCollections.length;
    let numResults = 0;
    cleanedResults.featureCollections.forEach((fc) => {
      numResults += fc.value.features.length;
    });

    let spacesPerSource = Math.floor(numResults / numSourcesWithResults);

    if (numResults <= 7) {
      //All results can be shown
      return this.flattenAndSortAutoCompleteList(cleanedResults);
    } else {
      cleanedResults.featureCollections.forEach((fc) => {
        if (fc.value.features.length > spacesPerSource) {
          fc.value.features.splice(spacesPerSource - 1);
        }
      });
      return this.flattenAndSortAutoCompleteList(cleanedResults);
    }
  };

  updateAutoCompleteList = () => {
    let { searchSources } = this.state;
    let promises = [];
    let searchResults = { errors: [], featureCollections: [] };
    if (searchSources.length === 0) {
      searchSources = this.searchModel.getSources();
    }

    let fetchOptions = this.getAutoCompleteFetchSettings();
    let active = true;

    (async () => {
      try {
        const promise = this.searchModel.getResults(
          this.state.searchString,
          searchSources, // this is a state variable!
          fetchOptions
        );
        promises.push(promise);

        this.props.searchImplementedPlugins.forEach((plugin) => {
          if (plugin.searchInterface.getResults) {
            promises.push(
              plugin.searchInterface.getResults(this.state.searchString)
            );
          }
        });

        Promise.allSettled(promises).then((results) => {
          results.forEach((result) => {
            searchResults.featureCollections = searchResults.featureCollections.concat(
              result.value.featureCollections
            );
            searchResults.errors = searchResults.errors.concat(
              result.value.errors
            );
          });

          // It's possible to handle any errors in the UI by checking if Search Model returned any
          searchResults.errors.length > 0 &&
            console.error("Autocomplete error: ", searchResults.errors);

          this.setState({
            autocompleteList: this.prepareAutoCompleteList(searchResults),
          });
        });
      } catch (error) {
        // If we catch an error, display it to the user
        // (preferably in a Snackbar instead of console).
        console.error("Autocomplete error: ", error);

        // Also, set "open" state variable to false, which
        // abort the "loading" state of Autocomplete.
        if (active) {
          this.setState({
            open: false,
          });
        }
      } finally {
        // Regardless if we had an error or not, we're done.
        return () => {
          active = false;
        };
      }
    })();
  };

  getSearchResultsFetchSettings = () => {
    return this.getUserCustomFetchSettings(this.searchModel.getSearchOptions());
  };

  getUserCustomFetchSettings = (searchOptionsFromModel) => {
    const {
      activeSpatialFilter,
      matchCase,
      wildcardAtEnd,
      wildcardAtStart,
    } = this.state;
    let customSearchOptions = { ...searchOptionsFromModel };
    customSearchOptions["activeSpatialFilter"] = activeSpatialFilter; // "intersects" or "within"
    customSearchOptions["featuresToFilter"] = this.drawSource.getFeatures();
    customSearchOptions["matchCase"] = matchCase;
    customSearchOptions["wildcardAtStart"] = wildcardAtStart;
    customSearchOptions["wildcardAtEnd"] = wildcardAtEnd;
    return customSearchOptions;
  };

  getAutoCompleteFetchSettings = () => {
    let fetchSettings = { ...this.searchModel.getSearchOptions() };
    fetchSettings["maxResultsPerDataset"] = 5;
    return fetchSettings;
  };

  hasEnoughCharsForSearch = (searchString) => {
    return searchString.length >= 3;
  };

  async doSearch() {
    // Wrap all calls to Search Model in a try/catch because
    // Search Model may throw Errors which we should handle
    // in the UI Component.
    let { searchString, searchSources } = this.state;
    let searchResults = { errors: [], featureCollections: [] };

    if (searchSources.length === 0) {
      searchSources = this.searchModel.getSources();
    }

    if (!this.hasEnoughCharsForSearch(searchString)) {
      return null;
    }

    let promises = [];

    try {
      const promise = this.searchModel.getResults(
        searchString,
        searchSources, // this is a state variable!
        this.getSearchResultsFetchSettings()
      );
      promises.push(promise);

      this.props.searchImplementedPlugins.forEach((plugin) => {
        if (plugin.searchInterface.getResults) {
          promises.push(plugin.searchInterface.getResults(searchString));
        }
      });

      Promise.allSettled(promises).then((results) => {
        results.forEach((result) => {
          searchResults.featureCollections = searchResults.featureCollections.concat(
            result.value.featureCollections
          );
          searchResults.errors = searchResults.errors.concat(
            result.value.errors
          );
        });

        // It's possible to handle any errors in the UI by checking if Search Model returned any
        searchResults.errors.length > 0 && console.error(searchResults.errors);

        this.setState({
          searchResults,
          showSearchResults: true,
          loading: false,
          autoCompleteOpen: false,
        });

        this.addFeaturesToResultsLayer(searchResults.featureCollections);
      });
    } catch (err) {
      console.error("Show a nice error message to user with info:", err);
    }
  }

  addFeaturesToResultsLayer = (featureCollections) => {
    this.resultsSource.clear();

    const features = featureCollections.map((fc) =>
      fc.value.features.map((f) => {
        const geoJsonFeature = new GeoJSON().readFeature(f);
        return geoJsonFeature;
      })
    );

    features.map((f) => this.resultsSource.addFeatures(f));

    // Zoom to fit all features
    // const currentExtent = this.resultsSource.getExtent();

    // if (currentExtent.map(Number.isFinite).includes(false) === false) {
    //   this.map.getView().fit(currentExtent, {
    //     size: this.map.getSize(),
    //     maxZoom: 7,
    //   });
    // }
  };

  getAutoCompleteResultIcon = (origin) => {
    switch (origin) {
      case "WFS":
        return <RoomIcon color="disabled"></RoomIcon>;
      case "DOCUMENT":
        return <DescriptionIcon color="disabled"></DescriptionIcon>;
      default:
        return <RoomIcon color="disabled"></RoomIcon>;
    }
  };

  renderPopover = () => {
    const {
      moreOptionsId,
      anchorEl,
      wildcardAtEnd,
      wildcardAtStart,
      matchCase,
      drawActive,
      activeSpatialFilter,
      selectSourcesOpen,
    } = this.state;
    return (
      <Popover
        id={moreOptionsId}
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => this.setState({ anchorEl: null })}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Paper>
          <Typography>Fler inställningar</Typography>
          <ToggleButton
            value="selectSourcesOpen"
            selected={selectSourcesOpen}
            onChange={() =>
              this.setState({
                selectSourcesOpen: !selectSourcesOpen,
                anchorEl: undefined,
              })
            }
          >
            <PlaylistAddCheckIcon size="small" />
          </ToggleButton>
          <ToggleButton
            value="wildcardAtStart"
            selected={wildcardAtStart}
            onChange={() =>
              this.setState({ wildcardAtStart: !wildcardAtStart })
            }
          >
            *.
          </ToggleButton>
          <ToggleButton
            value="wildcardAtEnd"
            selected={wildcardAtEnd}
            onChange={() => this.setState({ wildcardAtEnd: !wildcardAtEnd })}
          >
            .*
          </ToggleButton>
          <ToggleButton
            value="matchCase"
            selected={matchCase}
            onChange={() => this.setState({ matchCase: !matchCase })}
          >
            <FormatSizeIcon />
          </ToggleButton>
          <ToggleButton
            value="drawActive"
            selected={drawActive}
            onChange={this.handleClickOnDrawToggle}
          >
            <BrushTwoToneIcon />
          </ToggleButton>
          <ToggleButton
            value="activeSpatialFilter"
            selected={activeSpatialFilter === "intersects"}
            onChange={() =>
              this.setState({
                activeSpatialFilter:
                  activeSpatialFilter === "intersects"
                    ? "within"
                    : "intersects",
              })
            }
          >
            {activeSpatialFilter === "intersects" ? (
              <IntersectsIcon />
            ) : (
              <WithinIcon />
            )}
          </ToggleButton>
        </Paper>
      </Popover>
    );
  };

  renderSearchResultList = () => {
    const { searchResults, resultPanelCollapsed } = this.state;
    console.log("searchResults: ", searchResults);

    return (
      <SearchResultsContainer
        searchResults={searchResults}
        resultsSource={this.resultsSource}
        featureCollections={searchResults.featureCollections}
        map={this.map}
        panelCollapsed={resultPanelCollapsed}
      />
    );
  };

  renderAutoComplete = () => {
    const {
      autocompleteList,
      loading,
      moreOptionsId,
      autoCompleteOpen,
      searchString,
    } = this.state;
    const { classes } = this.props;
    return (
      <Autocomplete
        id="searchInputField"
        freeSolo
        size={"small"}
        classes={{
          inputRoot: classes.inputRoot, // class name, e.g. `classes-nesting-root-x`
        }}
        clearOnEscape
        autoComplete
        value={searchString}
        selectOnFocus
        open={autoCompleteOpen}
        disableClearable
        onChange={this.handleOnChange}
        onInputChange={this.handleOnInputChange}
        getOptionSelected={(option, value) =>
          option.autocompleteEntry === value.autocompleteEntry
        }
        renderOption={(option) => {
          return (
            <>
              {this.getAutoCompleteResultIcon(option.origin)}

              <Typography style={{ paddingRight: 8 }}>
                {option.autocompleteEntry}
              </Typography>
              <FormHelperText>{option.dataset}</FormHelperText>
            </>
          );
        }}
        getOptionLabel={(option) => option?.autocompleteEntry || option}
        options={autocompleteList}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label={undefined}
            variant="outlined"
            placeholder="Sök..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                  <IconButton size="small" onClick={this.handleClickOnSearch}>
                    <SearchIcon />
                  </IconButton>
                  {searchString.length > 0 ? (
                    <IconButton
                      onClick={() => this.setState({ searchString: "" })}
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      aria-describedby={moreOptionsId}
                      onClick={this.handleClickOnMoreOptions}
                    >
                      <MoreHorizIcon />
                    </IconButton>
                  )}
                </>
              ),
            }}
          />
        )}
      />
    );
  };

  renderSelectSearchOptions = () => {
    const { searchSources, selectSourcesOpen } = this.state;
    const { classes } = this.props;
    return (
      <Autocomplete
        className={cslx(selectSourcesOpen === false ? classes.hidden : null)}
        onChange={(event, value, reason) =>
          this.setState({ searchSources: value })
        }
        value={searchSources}
        multiple
        id="searchSources"
        options={this.searchModel.getSources()}
        disableCloseOnSelect
        getOptionLabel={(option) => option.caption}
        renderOption={(option, { selected }) => (
          <>
            <Checkbox
              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
              checkedIcon={<CheckBoxIcon fontSize="small" />}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option.caption}
          </>
        )}
        style={{ width: 400 }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            // label="Sökkällor"
            placeholder="Välj sökkälla"
          />
        )}
      />
    );
  };

  render() {
    const { classes } = this.props;
    const { panelCollapsed, showSearchResults } = this.state;

    return (
      <Grid
        className={cslx(classes.searchContainer, {
          [classes.searchCollapsed]: panelCollapsed,
        })}
      >
        <Grid item>
          <Paper>
            {this.renderAutoComplete()}
            {this.renderPopover()}
            {this.renderSelectSearchOptions()}
          </Paper>
        </Grid>
        {showSearchResults && this.renderSearchResultList()}
      </Grid>
    );
  }
}

export default withStyles(styles)(SearchBar);
