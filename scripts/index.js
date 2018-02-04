/**
 * Main properties :
 * {html nodes} bar and progression
 * {data} sequences
 * {function} interval
 * {properties} width, time, step, stepStart, isPaused, marge
 */
var sequences,
  interval,
  bar,
  progression,
  marge,
  width,
  time,
  step,
  stepStart,
  isPaused;

// those key values has been tested on MAC OS
var KEY_SPACE = 32;
var KEY_LEFT = 37;
var KEY_RIGHT = 39;

/**
 * Initialise the page at the launch
 *
 */
(function init() {
  const xmlhttp = new XMLHttpRequest();
  const url = "data.json";
  let totalDuration;

  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var res = JSON.parse(this.responseText);

      setPage(res);
      // Register page shortcuts
      document.addEventListener("keyup", doc_keyUp, false);
    }
  };

  xmlhttp.open("GET", url, true);
  xmlhttp.send();

  /**
   * Set the page content
   *
   */
  function setPage(res) {
    document.querySelector("#title").innerHTML = res.title;
    document.querySelector("#date").innerHTML = res.date;

    sequences = res.sequences;
    initProgressBar(sequences);
  }

  /**
   * This function is called on a document key_up
   * Code the shortcuts here
   */
  function doc_keyUp(event) {
    console.log("You pressed", event.keyCode);
    if (event.keyCode == KEY_SPACE) {
      ///
      // SPACE toggle start/pause
      ///
      // We must prevent SPACE default behavior
      // because if we don't SPACE bar will also push on any selected element
      // For example, if START button is selected, you push SPACE then
      // toggleStartPause is called
      // then button is pushed by the event chain and
      // then timer is toggled another time
      event.preventDefault();
      // And at last, toggle the clock
      toggleStartPause();
    } else if (event.keyCode == KEY_LEFT) {
      previousStep();
    } else if (event.keyCode == KEY_RIGHT) {
      nextStep();
    }
  }

  /**
   * Create the time progress bar node
   * Append progress bars in it according to the array
   * @param {array} arr
   */
  function initProgressBar(arr) {
    setSequenceSize(arr);

    var out = '<div id="bar" class="bar"></div>';
    var i;
    for (i = 0; i < arr.length; i++) {
      out +=
        '<div class="progress-bar progress-bar-striped \
            progress-bar-animated ' +
        arr[i].color +
        '" \
            role="progressbar" aria-valuemin="0" \
            aria-valuemax="' +
        totalDuration +
        '" \
            style="width:' +
        arr[i].durationPercent +
        "%; \
            background-color:" +
        arr[i].color +
        ';">' +
        arr[i].title +
        "</div>";
    }

    document.querySelector("#progress").innerHTML = out;
    setProgressBar();
    setDate();
  }

  /**
   * Set the progress bar default properties
   *
   */
  function setProgressBar() {
    /* The progress bar */
    bar = document.querySelector("#bar");

    time = 0;

    /* The progress bar size in percent */
    width = 100;

    /* The percent text node */
    progression = document.querySelector("#progression");

    interval = setInterval(move, 10);

    /* The percentage of the progress bar
        * at which we must begin for the next step
        */
    stepStart = 0;

    /* The current step index */
    step = 0;

    /* Percentage of progression that must be done each 0.01 sec */
    marge = getMarge();

    /* Checker for the progress state (running or not) */
    isPaused = true;

    /* Init the subtitle at launch */
    setSubTitle(sequences[0].title);
  }

  /**
   * Get the progression marge for the bar according to the time needed
   *
   * @returns {number}
   */
  function getMarge() {
    return 1000 / (totalDuration * 60000);
  }

  /**
   * Get the total duraiton of the progress bar
   *
   * @param {array} seq
   */
  function getTotalDuration(seq) {
    let total = 0;
    for (i in seq) {
      total += seq[i].duration;
    }

    return total;
  }

  function percent(d) {
    return parseFloat((d * 100 / totalDuration).toFixed(1));
  }

  /**
   * Split the progress bar into sequences according to the duration of each one
   */
  function setSequenceSize() {
    totalDuration = getTotalDuration(sequences) || 0;
    for (i in sequences) {
      sequences[i].durationPercent = percent(sequences[i].duration);
    }
  }

  /**
   * Define the current date and display it in #date node
   *
   */
  function setDate() {
    const currentDate = new Date();
    let day = currentDate.getDate();
    let month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    if (day < 10) {
      day = "0" + day;
    }

    if (month < 10) {
      month = "0" + month;
    }
    const today = `${day}/${month}/${year}`;

    const date = document.querySelector("#date");
    date.innerHTML = today;
  }
})();

/**
 * Launch the progress bar
 * : reduce the #bar width from 100 to 0
 */
function move() {
  if (!isPaused) {
    /* 0 < width < 100 */
    if (width <= 0) {
      clearInterval(interval);
    } else {
      width = width - marge;
      time += 10;
      bar.style.width = width + "%";
      //updateTime(width);
      updatePercent(width);

      /* parseFloat((100 - (width + stepStart)).toFixed(1)) is equal to the percentage of the current progression */
      if (
        sequences[step].durationPercent ===
        parseFloat((100 - (width + stepStart)).toFixed(1))
      ) {
        updateBar();
        //stop();
      }
    }
  }
}

/**
 * Update progress bar properties
 *
 */
function updateBar() {
  stepStart += sequences[step].durationPercent;
  step++;

  if (sequences[step]) {
    setSubTitle(sequences[step].title);
    if (sequences[step].extra) {
      setExtra(sequences[step].extra);
    } else {
      setExtra();
    }
  } else {
    setSubTitle("Finished !");
  }
}

/**
 * Define the page subtitle according to the current sequence
 *
 * @param {string} t
 */
function setSubTitle(t) {
  title = document.querySelector("#subtitle");
  title.style.display = "none";
  title.innerHTML = t;
  setTimeout(function() {
    title.style.display = "block";
  }, 100);
}

/**
 * Define the page extra content
 * : Hide the container if no param defined
 *
 * @param {string} str
 */
function setExtra(str) {
  extra = document.querySelector("#extra");
  extra.style.display = "none";

  if (str) {
    extra.innerHTML = str;
    setTimeout(function() {
      extra.style.display = "block";
    }, 100);
  }
}

/**
 * Update #progression node value
 * : append percent progression
 *
 * @param {number} p
 */
function updatePercent(p) {
  progression.innerHTML = `${(100 - p).toFixed(1)}%`;
}

/**
 * Update #progression node value
 * : append time progression
 *
 */
function updateTime() {
  progression.innerHTML = `${timeConversion(time)}`;
}

/**
 * Convert milliseconds to user readable time
 *
 * @param {number} millisec
 * @returns {string}
 */
function timeConversion(millisec) {
  const seconds = (millisec / 1000).toFixed(1);
  const minutes = (millisec / (1000 * 60)).toFixed(2);
  const hours = (millisec / (1000 * 60 * 60)).toFixed(4);

  if (seconds < 60) {
    return seconds + " Sec";
  } else if (minutes < 60) {
    return minutes + " Min";
  } else if (hours < 24) {
    return hours + " Hrs";
  }
}

/**
 * Move the progress bar to a defined sequence start
 *
 * @param {number} s
 * @param {boolean} force
 */
function goToStep(s, force) {
  if (!isPaused) toggleStartPause(true);

  if (s === 0) {
    /* If step 1 running go back to step one begin*/
    if (width < 100 - sequences[1].durationPercent && !force) {
      stepStart = sequences[s].durationPercent;
      s = step;
      /* Else refresh to the begining */
    } else {
      stepStart = 0;
    }
  } else {
    if (step < s) {
      stepStart += sequences[step].durationPercent;
    } else {
      /* If step not finished, refresh it instead of going back */
      if (width !== 100 - stepStart) {
        s = step;
      } else {
        stepStart -= sequences[step - 1].durationPercent;
      }
    }
  }

  step = s;
  width = 100 - stepStart;
  bar.style.width = width + "%";
  updatePercent(width);

  if (sequences[step]) {
    setSubTitle(sequences[step].title);

    if (sequences[step].extra) {
      setExtra(sequences[step].extra);
    } else {
      setExtra();
    }
  }
}

function previousStep() {
  if (step !== 0) {
    goToStep(step - 1);
  }
}

function nextStep() {
  const nbStep = sequences.length;
  if (step !== nbStep) {
    goToStep(step + 1);
  }
}

/**
 * Manage the time bar progression (start/pause)
 * Also redefine the start button content text
 *
 */
function toggleStartPause(v) {
  if (v) {
    isPaused = v;
  } else {
    isPaused = !isPaused;
  }

  const startBtn = document.querySelector("#startBtn");

  if (isPaused) {
    startBtn.innerHTML = "Start";
  } else {
    startBtn.innerHTML = "Pause";
  }
}

function stop() {
  clearInterval(interval);
}

function restart() {
  goToStep(0, true);
}
