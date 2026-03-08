import getParliamentPoints from './chart-helpers';
import debugGuides from './debug';

/**
 *  ___ ____    ___          _ _                    _       ___ _             _
 * |   \__ /   | _ \__ _ _ _| (_)__ _ _ __  ___ _ _| |_    / __| |_  __ _ _ _| |_
 * | |) |_ \   |  _/ _` | '_| | / _` | '  \/ -_) ' \  _|  | (__| ' \/ _` | '_|  _|
 * |___/___/   |_| \__,_|_| |_|_\__,_|_|_|_\___|_||_\__|   \___|_||_\__,_|_|  \__|
 *
 * A d3 plugin for making semi-circle parliament charts.
 */

export default (data = [], width = 0) => {
  // Dimensions of the graphic
  let graphicWidth = parseFloat(width);

  // clean out any x and y values provided in data objects.
  let rawData = data.map(({ x, y, ...restProps }) => restProps);

  // visual options
  const options = {
    sections: 4,         // Number of sections to divide the half circle into
    sectionGap: 60,      // The gap of the aisle between sections
    seatRadius: 12,      // The radius of each seat
    rowHeight: 42,       // The height of each row
  };

  // Whether we should draw the debug lines or not
  let debug = false;

  // Optional icon renderer for seats.
  // Accepts a string path (legacy) or a function(datum, helpers).
  let seatIcon = null;

  // Expected icon coordinate size. Most icon paths use 24x24 view boxes.
  let seatIconViewBox = { width: 24, height: 24 };

  // Normalize icon viewBox value to a usable object.
  const normalizeSeatIconViewBox = (viewBox, fallback = { width: 24, height: 24 }) => {
    if (typeof viewBox === 'number' && viewBox > 0) {
      return { width: viewBox, height: viewBox };
    }

    if (
      viewBox
      && typeof viewBox === 'object'
      && typeof viewBox.width === 'number'
      && typeof viewBox.height === 'number'
      && viewBox.width > 0
      && viewBox.height > 0
    ) {
      return { width: viewBox.width, height: viewBox.height };
    }

    return fallback;
  };

  const resolveSeatIconViewBox = (d, i) => {
    const fallback = { width: 24, height: 24 };

    if (typeof seatIconViewBox === 'function') {
      const maybeViewBox = seatIconViewBox(d, {
        index: i,
        seatRadius: options.seatRadius,
        seatDiameter: options.seatRadius * 2,
        color: d.color || '#AAA',
      });
      return normalizeSeatIconViewBox(maybeViewBox, fallback);
    }

    return normalizeSeatIconViewBox(seatIconViewBox, fallback);
  };

  // //////////////////////////////////////////////////////////////////////////
  // Selection call
  //
  // This function gets called on instances such as:
  //    d3.select('g').call(parliamentChart())
  const parliamentChart = (selection) => {
    if (graphicWidth === 0) {
      // Sets the graphicWidth based on our selected container
      graphicWidth = selection.node().getBoundingClientRect().width;
    }

    // Get the processed data (filter for entries that have x and y locations)
    const processedData = parliamentChart.data().filter((r) => r.x && r.y);

    // Remove existing chart
    selection.select('g.parliament-chart').remove();

    // Add new chart
    const innerSelection = selection
      .append('g')
      .attr('class', 'parliament-chart');

    // First remove any existing debug lines
    innerSelection.select('g.debug').remove();

    // Append debug lines
    if (debug) debugGuides(innerSelection, graphicWidth, options, processedData.length);

    if (!seatIcon) {
      return innerSelection
        .selectAll('circle')
        .data(processedData)
        .enter()
        .insert('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', options.seatRadius)
        .attr('fill', (d) => d.color || '#AAA');
    }

    const seats = innerSelection
      .selectAll('g.seat')
      .data(processedData)
      .enter()
      .append('g')
      .attr('class', 'seat')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('fill', (d) => d.color || '#AAA')
      .attr('color', (d) => d.color || '#AAA');

    const elements = seats
      .append('g')
      .attr('class', 'seat-element')
      .attr('transform', (d, i) => {
        const viewBox = resolveSeatIconViewBox(d, i);
        const iconScale = (options.seatRadius * 2) / Math.max(viewBox.width, viewBox.height);
        const iconTranslateX = -(viewBox.width / 2);
        const iconTranslateY = -(viewBox.height / 2);
        return `scale(${iconScale}) translate(${iconTranslateX},${iconTranslateY})`;
      });

    if (typeof seatIcon === 'function') {
      elements.each(function seatIconEach(d, i) {
        const maybePath = seatIcon(d, {
          index: i,
          seatRadius: options.seatRadius,
          seatDiameter: options.seatRadius * 2,
          color: d.color || '#AAA',
          viewBox: resolveSeatIconViewBox(d, i),
        });

        // Backward-compatible function support: returning a string draws an SVG path.
        if (typeof maybePath === 'string') {
          this.innerHTML = `<path d="${maybePath}" fill="currentColor"></path>`;
        }
      });
    } else {
      // Backward-compatible string support: seatIcon string is treated as SVG path `d`.
      elements
        .append('path')
        .attr('d', seatIcon)
        .attr('fill', 'currentColor');
    }

    return seats;
  };

  // //////////////////////////////////////////////////////////////////////////
  // Getters and Setters

  // Sets the width and the height of the graphic
  parliamentChart.width = (w) => {
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(w)) {
      // parse the width
      graphicWidth = parseFloat(w);
    }
    return parliamentChart;
  };

  // Create getters and setters for sections, sectionGap, seatRadius, and rowHeight
  Object.keys(options)
    .forEach((attr) => {
      parliamentChart[attr] = (s) => {
        // eslint-disable-next-line no-restricted-globals
        if (!isNaN(s)) {
          options[attr] = parseInt(s, 10);
          return parliamentChart;
        }
        return options[attr];
      };
    });

  // enable / disable debug mode
  parliamentChart.debug = (b) => {
    debug = !!b;
    return parliamentChart;
  };

  // Set or get seat icon renderer.
  // Accepts string path (legacy) or function(datum, helpers).
  parliamentChart.seatIcon = (icon) => {
    if (typeof icon === 'string' || typeof icon === 'function' || icon === null) {
      seatIcon = icon;
      return parliamentChart;
    }
    return seatIcon;
  };

  // Set or get icon coordinate size. Use 24 for most material-style icons.
  // Accepts number, {width, height}, or function(datum, helpers).
  parliamentChart.seatIconViewBox = (viewBox) => {
    if (typeof viewBox === 'number') {
      seatIconViewBox = { width: viewBox, height: viewBox };
      return parliamentChart;
    }

    if (typeof viewBox === 'function') {
      seatIconViewBox = viewBox;
      return parliamentChart;
    }

    if (normalizeSeatIconViewBox(viewBox, null)) {
      seatIconViewBox = {
        width: viewBox.width,
        height: viewBox.height,
      };
      return parliamentChart;
    }

    return seatIconViewBox;
  };

  // //////////////////////////////////////////////////////////////////////////
  // Data Processing
  //
  // Gets the data processed data with x and y coordinates or sets
  // the raw data.
  parliamentChart.data = (d) => {
    // If an argument with new data is provided
    if (d) {
      // clean out any x and y values provided in data objects.
      rawData = d.map(({ x, y, ...restProps }) => restProps);
      return parliamentChart;
    }

    // If width is not set, don't calculate this instance
    if (graphicWidth <= 0 || rawData.length <= 0) return rawData;

    // Check if we have already run this instance
    if (rawData.every((r) => r.x && r.y)) return rawData;

    // The number of points we need to fit
    const totalPoints = rawData.length;

    // The locations of all the points
    const locations = getParliamentPoints(totalPoints, options, graphicWidth);

    // Add locations to the rawData object
    locations.forEach((coords, i) => rawData[i] = ({ ...rawData[i], ...coords }));

    // return the data
    return rawData;
  };

  // Instead of passing in an array of every single point, we pass in an array of objects
  // that each have a key `seats` that specifies the number of seats. This function can only
  // set, not get.
  parliamentChart.aggregatedData = (d) => {
    rawData = d.reduce((acc, val) => {
      const { seats = 0, x, y, ...restProps } = val;
      return [...acc, ...Array(seats).fill(restProps)];
    }, []);

    return parliamentChart;
  };

  return parliamentChart;
};
