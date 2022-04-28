import React from "react";
import {
  FormControl,
  FormLabel,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tooltip,
} from "@mui/material";

import Information from "../components/Information";

import LocalStorageHelper from "utils/LocalStorageHelper";
import useCookieStatus from "hooks/useCookieStatus";

import {
  STORAGE_KEY,
  AREA_MEASUREMENT_UNITS,
  LENGTH_MEASUREMENT_UNITS,
  MEASUREMENT_PRECISIONS,
} from "../constants";

const SettingsView = (props) => {
  // Let's destruct some props
  const { model, id, measurementSettings, setMeasurementSettings } = props;
  // Then we'll get some information about the current activity (view)
  const activity = model.getActivityFromId(id);
  // We're gonna need to keep track of if we're allowed to save stuff in LS. Let's use the hook.
  const { functionalCookiesOk } = useCookieStatus(props.globalObserver);
  // We're gonna need some local state as well. For example, should we show helper-snacks?
  const [showHelperSnacks, setShowHelperSnacks] = React.useState(
    model.getShowHelperSnacks()
  );
  // An effect that makes sure to update the model with the user-choice regarding the helper-snacks.
  // The effect also makes sure to store the setting in the LS (if allowed).
  React.useEffect(() => {
    model.setShowHelperSnacks(showHelperSnacks);
    if (functionalCookiesOk) {
      LocalStorageHelper.set(STORAGE_KEY, {
        ...LocalStorageHelper.get(STORAGE_KEY),
        showHelperSnacks: showHelperSnacks,
      });
    }
  }, [model, showHelperSnacks, functionalCookiesOk]);

  return (
    <Grid container>
      <Grid item xs={12}>
        <Information text={activity.information} />
      </Grid>
      <Grid item xs={12} sx={{ marginTop: 2 }}>
        <FormControl component="fieldset">
          <FormLabel focused={false} component="legend">
            Generella inställningar
          </FormLabel>
          <Tooltip
            disableInteractive
            title={`Slå ${showHelperSnacks ? "av" : "på"} om du vill ${
              showHelperSnacks ? "dölja" : "visa"
            } hjälptexter.`}
          >
            <FormControlLabel
              label="Hjälptexter aktiverade"
              control={
                <Switch
                  checked={showHelperSnacks}
                  onChange={() => setShowHelperSnacks((show) => !show)}
                  color="primary"
                />
              }
            />
          </Tooltip>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl component="fieldset">
          <FormLabel focused={false} component="legend">
            Mätinställningar
          </FormLabel>
          <Tooltip
            disableInteractive
            title="Slå på om du vill visa objektens mått."
          >
            <FormControlLabel
              label="Visa mått på objekten"
              control={
                <Switch
                  checked={measurementSettings.showText}
                  onChange={() => {
                    setMeasurementSettings((settings) => ({
                      ...settings,
                      showText: !settings.showText,
                    }));
                  }}
                  color="primary"
                />
              }
            />
          </Tooltip>
          <Tooltip title="Slå på om du vill visa objektens area.">
            <FormControlLabel
              label="Visa objektens area"
              control={
                <Switch
                  checked={measurementSettings.showArea}
                  onChange={() => {
                    setMeasurementSettings((settings) => ({
                      ...settings,
                      showArea: !settings.showArea,
                    }));
                  }}
                  color="primary"
                />
              }
            />
          </Tooltip>
          <Tooltip title="Slå på om du vill visa objektens omkrets.">
            <FormControlLabel
              label="Visa objektens omkrets"
              control={
                <Switch
                  checked={measurementSettings.showPerimeter}
                  onChange={() => {
                    setMeasurementSettings((settings) => ({
                      ...settings,
                      showPerimeter: !settings.showPerimeter,
                    }));
                  }}
                  color="primary"
                />
              }
            />
          </Tooltip>
          <Tooltip title="Välj enhet för mätning av areal.">
            <FormControl size="small" style={{ marginTop: 8 }}>
              <InputLabel
                variant="outlined"
                id="sketch-select-area-measurement-unit-label"
              >
                Mätenhet, areal
              </InputLabel>
              <Select
                id="sketch-select-area-measurement-unit"
                labelId="sketch-select-area-measurement-unit-label"
                value={measurementSettings.areaUnit}
                label="Mätenhet, areal"
                variant="outlined"
                onChange={(e) => {
                  setMeasurementSettings((settings) => ({
                    ...settings,
                    areaUnit: e.target.value,
                  }));
                }}
              >
                {AREA_MEASUREMENT_UNITS.map((unit, index) => {
                  return (
                    <MenuItem value={unit.type} key={index}>
                      {unit.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Tooltip>
          <Tooltip title="Välj enhet för mätning av längd.">
            <FormControl size="small" style={{ marginTop: 16 }}>
              <InputLabel
                variant="outlined"
                id="sketch-select-length-measurement-unit-label"
              >
                Mätenhet, längd
              </InputLabel>
              <Select
                id="sketch-select-length-measurement-unit"
                labelId="sketch-select-length-measurement-unit-label"
                value={measurementSettings.lengthUnit}
                label="Mätenhet, längd"
                variant="outlined"
                onChange={(e) => {
                  setMeasurementSettings((settings) => ({
                    ...settings,
                    lengthUnit: e.target.value,
                  }));
                }}
              >
                {LENGTH_MEASUREMENT_UNITS.map((unit, index) => {
                  return (
                    <MenuItem value={unit.type} key={index}>
                      {unit.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Tooltip>
          <Tooltip title="Välj med vilken precision mätvärdena ska presenteras.">
            <FormControl size="small" style={{ marginTop: 16 }}>
              <InputLabel variant="outlined" id="sketch-select-precision-label">
                Mätprecision
              </InputLabel>
              <Select
                id="sketch-select-precision"
                labelId="sketch-select-precision-label"
                value={measurementSettings.precision ?? 0}
                label="Mätprecision"
                variant="outlined"
                onChange={(e) => {
                  setMeasurementSettings((settings) => ({
                    ...settings,
                    precision: parseInt(e.target.value),
                  }));
                }}
              >
                {MEASUREMENT_PRECISIONS.map((precision, index) => {
                  return (
                    <MenuItem value={precision.value} key={index}>
                      {precision.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Tooltip>
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default SettingsView;
