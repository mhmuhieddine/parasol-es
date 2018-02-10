/* ----------------------------------------------------------------------
para-mova.js 1.0.0

(c) 2018 Kasprzyk Research Group - University of Colorado Boulder
https://josephkasprzyk.wordpress.com/group/

Contributers:
  Josh Jacobson
  William Raseman

NOTE: Properly address credits
Credit:
  Kai Chang
  Julian Heinrich
  Patrick Reed
---------------------------------------------------------------------- */

// define parallel coordinates variable
var pc1 = d3.parcoords()("#row-1")
  .alpha(0.4)
  .mode("queue")
  .height(200)
  // .height(d3.max([document.body.clientHeight-326, 180]))
  .margin({
    top: 16,
    left: 16,
    right: 16,
    bottom: 16
  });

var pc2 = d3.parcoords()("#row-2")
  .alpha(0.4)
  .mode("queue")
  .height(200)
  // .height(d3.max([document.body.clientHeight-326, 180]))
  .margin({
    top: 16,
    left: 16,
    right: 16,
    bottom: 16
  });


// create chart from loaded data
function parallelCoordinates(data) {

  // slickgrid needs each data element to have an id
  data.forEach(function(d, i) {
    d.id = d.id || i;
  });

  // TODO: allow user to determine which columns are which
  //let ncols = d3.keys(data[0]).length;
  var variables = d3.keys(data[0]).slice(0, -1); //remove id col
  var id_col = d3.keys(data[0]).pop()
  var objective_vars = _.union(variables.slice(0, 3), [id_col]);
  var decision_vars = _.union(variables.slice(3), [id_col]);

  // keep track of brushed data
  var brushed_pc1 = [];
  var brushed_pc2 = [];

  // keep track of brushed axes
  var brushes_pc1 = [];
  var brushes_pc2 = [];

  // not necessary eventually
  var isBrushed_pc1 = false;
  var isBrushed_pc2 = false;

  // may need to go back to max/min of brushExtents object
  // reset all brushes every time then add in only that which
  // falls in range of brushes

  // objective space
  pc1
    .data(data)
    .hideAxis(decision_vars)
    .render()
    .shadows()
    .reorderable()
    .brushMode("1D-axes-multi")
    .on("brushend", function(brushed) {
      console.log("pc1", brushed_pc1.length)
      /*
      console.log("last", _.keys(brushes_pc1))
      console.log("current", _.keys(pc1.brushExtents()))
      console.log("diff", _.difference(_.keys(pc1.brushExtents()), _.keys(brushes_pc1)))
      */
      if (_.difference(_.keys(pc1.brushExtents()), _.keys(brushes_pc1)).length > 0) {
        // first brush on axis, handle as normal
        console.log("new axis")
        console.log(pc1.brushExtents())
        brushed_pc1 = brushed;
      } else {
        // already a brush on this axis
        // add multi-brush data back into array
        brushed_pc1 = _.union(brushed_pc1, brushed);
        //brushed_pc2 = brushed_pc1;
        console.log("went union")
      }
      console.log("pc1", brushed_pc1.length)
      console.log("pc2", brushed_pc2.length)

      if (_.keys(brushes_pc2).length > 0) {
        // pc2 has brushes, keep only the intersection of arrays
        brushed_pc2 = _.intersection(brushed_pc1, brushed_pc2);
        console.log("went intersect")
      } else {
        brushed_pc2 = brushed_pc1;
      }
      console.log("pc2", brushed_pc2.length)

      brushed_pc1 = brushed_pc2;
      brushes_pc1 = pc1.brushExtents();

      pc2.brushed(brushed_pc2);
      pc2.render();

      pc1.brushed(brushed_pc1);
      pc1.render();

      gridUpdate(brushed_pc2);
    });

  // decision space
  pc2
    .data(data)
    .hideAxis(objective_vars)
    .render()
    .shadows()
    .reorderable()
    .brushMode("1D-axes-multi")
    .on("brushend", function(brushed) {
      console.log("pc2", brushed_pc1.length)
      /*
      let temp = pc2.brushExtents()
      let id = 'id'
      console.log(temp[id])
      for(let t in temp){
        console.log(t, ":",temp[t]);
      }
      */

      if (isBrushed_pc2) {
        // add multi-brush data back into array
        brushed_pc2 = _.union(brushed_pc2, brushed);
      } else {
        brushed_pc2 = brushed;
      }

      //brushed_pc2 = brushed;
      console.log("pc2", brushed_pc2.length)
      if (isBrushed_pc1) {
        // keep only the intersection of brushes
        brushed_pc1 = _.intersection(brushed_pc1, brushed_pc2);
        console.log("went intersect")
      } else {
        brushed_pc1 = brushed;
      }
      isBrushed_pc2 = true;
      brushed_pc2 = brushed_pc1;
      brushes_pc2 = pc2.brushExtents();
      console.log(brushed_pc1.length, brushed_pc2.length);
      console.log("pc1", brushed_pc1.length)
      pc1.brushed(brushed_pc1);
      pc1.render();

      pc2.brushed(brushed_pc2);
      pc2.render();

      gridUpdate(brushed_pc2);
    });

  // setting up grid
  var column_keys = d3.keys(data[0]).slice(0, -1); //remove id col
  var columns = column_keys.map(function(key, i) {
    return {
      id: key,
      name: key,
      field: key,
      sortable: true
    }
  });

  var options = {
    enableCellNavigation: true,
    enableColumnReorder: false,
    multiColumnSort: false
  };

  var dataView = new Slick.Data.DataView();
  var grid = new Slick.Grid("#grid", dataView, columns, options);

  // wire up model events to drive the grid
  dataView.onRowCountChanged.subscribe(function(e, args) {
    grid.updateRowCount();
    grid.render();
  });

  dataView.onRowsChanged.subscribe(function(e, args) {
    grid.invalidateRows(args.rows);
    grid.render();
  });

  // column sorting
  var sortcol = column_keys[0];
  var sortdir = 1;

  function comparer(a, b) {
    var x = a[sortcol],
      y = b[sortcol];
    return (x == y ? 0 : (x > y ? 1 : -1));
  }

  // click header to sort grid column
  grid.onSort.subscribe(function(e, args) {
    sortdir = args.sortAsc ? 1 : -1;
    sortcol = args.sortCol.field;

    if ($.browser.msie && $.browser.version <= 8) {
      dataView.fastSort(sortcol, args.sortAsc);
    } else {
      dataView.sort(comparer, args.sortAsc);
    }
  });

  // highlight row in chart
  grid.onMouseEnter.subscribe(function(e, args) {
    var i = grid.getCellFromEvent(e).row;
    var d1 = pc1.brushed() || data;
    var d2 = pc2.brushed() || data;
    pc1.highlight([d1[i]]);
    pc2.highlight([d2[i]]);
  });
  grid.onMouseLeave.subscribe(function(e, args) {
    pc1.unhighlight();
    pc2.unhighlight();
  });



  // reset brushes
  d3.select('#brush-reset').on('click', function() {
    // reset global vars
    brushed_pc1 = [];
    brushed_pc2 = [];
    isBrushed_pc1 = false;
    isBrushed_pc2 = false;

    pc1.brushReset();
    pc2.brushReset();

    gridUpdate(data);

  });

  // fill grid with data
  gridUpdate(data);

  /*
  // update grid on brush
  pc1.on("brush", function(d) {
    gridUpdate(d);
  });
  pc2.on("brush", function(d) {
    gridUpdate(d);
  });
  */

  /*
  function linkedBrush(brushed) {
    pc1.brushed(bruhed);
    pc2.brushed(brushed);

    pc1.render();
    pc2.render();
  };
  */

  function gridUpdate(data) {
    dataView.beginUpdate();
    dataView.setItems(data);
    dataView.endUpdate();
  };

};


// CSV Uploader
var uploader = document.getElementById("uploader");
var reader = new FileReader();

reader.onload = function(e) {
  var contents = e.target.result;
  var data = d3.csv.parse(contents); //data in global var to reset brushes

  // this part is just for my sanity with the cars dataset
  data.forEach(function(car) {
    delete car.name;
    delete car.year;
  });

  parallelCoordinates(data);

  // remove button, since re-initializing doesn't work for now
  uploader.parentNode.removeChild(uploader);

};

uploader.addEventListener("change", handleFiles, false);

function handleFiles() {
  var file = this.files[0];
  reader.readAsText(file);
};
