import { Meeting } from './models/meeting.js';
import { Sequence } from './models/sequence.js';

/**
 * Main properties :
 * {html nodes} bar and progression
 * {data} sequences
 * {function} interval
 * {properties} width, time, step, stepStart, isPaused, marge
 */
let meeting,
  interval,
  bar,
  totalProgression,
  sequenceProgression,
  marge,
  width,
  time,
  step,
  stepStart,
  totalDuration,
  isPaused,
  isSound;

/* Those key values have been tested on MAC OS */
const KEY_SPACE = 32;
const KEY_LEFT = 37;
const KEY_RIGHT = 39;

/**
 * Load a meeting template
 *
 * @param {string} meetingName
 */
function loadMeeting(meetingName) {
  // load a meeting template with given name
  const xmlhttp = new XMLHttpRequest();
  const url = `meetings/${meetingName}.json`;

  xmlhttp.onreadystatechange = function() {
    if(this.readyState == 1) {
      load(true);
    }
    if (this.readyState == 4 && this.status == 200) {
      const res = JSON.parse(this.responseText);
      meeting = new Meeting(res.title, res.sequences);

      setPage();
      load(false);
    }
  };

  xmlhttp.open("GET", url, true);
  xmlhttp.send();
};

/**
 * Set the page content
 *
 */
function setPage() {
  // Set current date
  const today = new Date();

  const d = today.getDay();
  const m = today.getMonth();
  const y = today.getFullYear();

  const todayStr = `${(d <= 9 ? '0' + d : d)}/${(m <= 9 ? '0' + m : m)}/${y}`

  // Set title and date
  document.querySelector("#title").innerHTML = meeting.title;
  document.querySelector("#date").innerHTML = todayStr;

  // Init progress bar
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }
  initProgressBar(meeting.getSequences());
}

function load(bool) {
  const loader = document.querySelector('#loader-container');
  if(bool) {
    loader.style.display = 'flex';
  } else {
    loader.style.display = 'none';
  }
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

  let out =
    '<div id="bar" class="bar"></div> \
  <span id="startText" class="progress-text">Start</span> ';
  let i;
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
      "<br/>(" +
      timeConversion(60000 * arr[i].duration) +
      ")</div>";
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

  isSound = true;

  time = 0;

  /* The progress bar size in percent */
  width = 100;

  /* The progression text nodes */
  sequenceProgression = document.querySelector("#sequenceProgression");
  totalProgression = document.querySelector("#totalProgression");

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
  setSubTitle(meeting.getSequence(0).title);
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
  for (let i in seq) {
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
  totalDuration = getTotalDuration(meeting.getSequences()) || 0;
  let beginAt = 0;
  for (let i in meeting.getSequences()) {
    let sequence = meeting.getSequence(i);
    sequence.durationPercent = percent(sequence.duration);
    sequence.beginAt = beginAt;
    sequence.endAt = beginAt + sequence.duration;
    beginAt += sequence.duration;
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
      updateRemainingTime(width);
      //updatePercent(width);

      /* parseFloat((100 - (width + stepStart)).toFixed(1)) is equal to the percentage of the current progression */
      if (
        meeting.getSequence(step).durationPercent ===
        parseFloat((100 - (width + stepStart)).toFixed(1))
      ) {
        updateBar();
        playSound();
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
  stepStart += meeting.getSequence(step).durationPercent;
  step++;

  if (meeting.getSequence(step)) {
    setSubTitle(meeting.getSequence(step).title);
    if (meeting.getSequence(step).extra) {
      setExtra(meeting.getSequence(step).extra);
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
  const title = document.querySelector("#subtitle");
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
  const extra = document.querySelector("#extra");
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
  totalProgression.innerHTML = `${(100 - p).toFixed(1)}%`;
}

/**
 * Update #progression node value
 * : append remaining time
 *
 * @param {number} p
 */
function updateTime(p) {
  let total = (totalDuration * 0.6 * (100 - p)).toFixed(0);
  totalProgression.innerHTML = `${total}s`;
}

/**
 * Update #progression node value
 * : append time progression
 *
 * @param {number} remainingPercent
 */
function updateRemainingTime(remainingPercent) {
  let remainingTimeInMilli = totalDuration * 600 * remainingPercent;
  remainingTimeInMilli = remainingTimeInMilli.toFixed(0);
  totalProgression.innerHTML = `${timeConversion(remainingTimeInMilli)}`;

  // Compute sequence remaining time
  let elapsedTimeInMilli = totalDuration * 600 * (100 - remainingPercent);
  elapsedTimeInMilli = elapsedTimeInMilli.toFixed(0);
  let endAtInMilli = meeting.getSequence(step).endAt * 60 * 1000;
  endAtInMilli = endAtInMilli.toFixed(0);
  let setRemainInMilli = endAtInMilli - elapsedTimeInMilli;
  sequenceProgression.innerHTML = `${timeConversion(setRemainInMilli)}`;
}

/**
 * Convert milliseconds to user readable time
 *
 * @param {number} millisec
 * @returns {string}
 */
function timeConversion(millisec) {
  let remainingSeconds = millisec / 1000;
  let hours = Math.floor(remainingSeconds / (60 * 60));
  remainingSeconds = remainingSeconds - hours * (60 * 60);
  let minutes = Math.floor(remainingSeconds / 60);
  remainingSeconds = remainingSeconds - minutes * 60;
  const seconds = Math.floor(remainingSeconds);

  let timeString = "";
  if (hours > 0) {
    timeString += hours + ":";
  }
  if (hours > 0 || minutes > 0) {
    if (minutes < 10) {
      timeString += "0";
    }
    timeString += minutes + ":";
  }
  if (seconds < 10) {
    timeString += "0";
  }
  timeString += seconds;
  return timeString;
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
    if (width < 100 - meeting.getSequence(1).durationPercent && !force) {
      stepStart = meeting.getSequence(s).durationPercent;
      s = step;
      /* Else refresh to the begining */
    } else {
      stepStart = 0;
    }
  } else {
    if (step < s) {
      stepStart += meeting.getSequence(step).durationPercent;
    } else {
      /* If step not finished, refresh it instead of going back */
      if (width !== 100 - stepStart) {
        s = step;
      } else {
        stepStart -= meeting.getSequence(step - 1).durationPercent;
      }
    }
  }

  step = s;
  width = 100 - stepStart;
  bar.style.width = width + "%";
  updateRemainingTime(width);

  if (meeting.getSequence(step)) {
    setSubTitle(meeting.getSequence(step).title);

    if (meeting.getSequence(step).extra) {
      setExtra(meeting.getSequence(step).extra);
    } else {
      setExtra();
    }
  }
}

function previousStep() {
  if (step !== 0) {
    goToStep(step - 1);
  } else {
    // when on first step
    // just go back to begining
    goToStep(0, true);
  }
}

function nextStep() {
  const nbStep = meeting.getSequences().length;
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

  const startText = document.querySelector("#startText");

  if (isPaused) {
    startText.innerHTML = "Start";
  } else {
    startText.innerHTML = "Pause";
  }
}

function stop() {
  clearInterval(interval);
}

function restart() {
  goToStep(0, true);
}

function openSettings() {
  document.querySelector('#settingsModal').style.display = "flex";
}

function closeSettings() {
  document.querySelector('#settingsModal').style.display = "none";
}

/**
 * Set a new meeting
 *
 */
function setNewMeeting() {
  const title = document.querySelector('#new-meeting-title').value;
  const sequences = document.querySelector('#new-meeting-sequences');

  // Refresh meeting
  meeting = new Meeting(title);

  // Add sequences
  const j = sequences.childElementCount;
  for(let i=0; i<j; i++) {
    const child = sequences.children[i];
    const kind = child.dataset.kind;
    const inputs = child.children;
    if(kind && kind === "step") {
      const seqName = inputs[0].value;
      const seqDuration = parseFloat(inputs[1].value);
      const seqColor = inputs[2].value;
      const seq = new Sequence(seqName, seqDuration, seqColor)
      meeting.addSequence(seq);
      console.log("Step added : "+seqName);
    }
  }

  // FIXME - Should check the whole defined time instead of just one sequence
  if(meeting.getSequences().length && (meeting.getSequence(0).duration > 0)) {
    // Reset the page
    setPage();
    closeSettings();
  } else {
    alert("Please set a correct time :)");
  }
}

/**
 *  Add a new step form in meeting settings view
 *
 */
function addStepForm() {
  const sequences = document.querySelector('#new-meeting-sequences');
  const seq = document.createElement("div");
  seq.dataset.kind = "step";
  seq.classList.add("sequences-table-line", "zoomIn");
  // FIXME - Should use class instead of style
  seq.innerHTML = `<input type="text" name="title" value="New step" style="width:250px; margin:0px 2px; text-align:left;"/>
                    <input type="number" name="duration" min="0.1" value="0.1" style="width:100px; margin:0px 2px; text-align:left;"/>
                    <select name="color" style="width:100px; margin:0px 2px; text-align:left;">
                      <option value="blue">blue</option>
                      <option value="red">red</option>
                      <option value="green">green</option>
                      <option value="yellow">yellow</option>
                      <option value="purple">purple</option>
                    </select>
                    <img src="assets/icons/ic_delete.svg" alt="Delete icon" class="default-btn" onclick="removeStepForm()">
                  </div>`;
  sequences.appendChild(seq, sequences.lastElementChild);
}

/**
 * Remove step form from meeting settings view
 *
 */
function removeStepForm(i) {
  const sequences = document.querySelector('#new-meeting-sequences');

  sequences.removeChild(i);
  //meeting.removeSequence(i)
}

/**
 * Launch a sound once
 *
 */
function playSound(){
  if(isSound) {
    const sound = document.querySelector('#sound');
    sound.play();
  }
}

/**
 * Toggle sound and set sound icon
 *
 */
function toggleSound() {
  isSound = !isSound;

  const soundManager = document.querySelector('#soundManager');
  if(isSound) {
    soundManager.setAttribute("src", "assets/icons/ic_volume_up.svg");
  } else {
    soundManager.setAttribute("src", "assets/icons/ic_volume_off.svg");
  }
}

/* Register page shortcuts */
document.addEventListener("keyup", doc_keyUp, false);

/* Create the progress bar when them DOM has been initialised */
document.addEventListener('DOMContentLoaded', function() {
  loadMeeting("data");

  // Bind module functions to window because of the scoped module
  window.toggleStartPause = toggleStartPause;
  window.loadMeeting = loadMeeting;
  window.nextStep = nextStep;
  window.previousStep = previousStep;
  window.restart = restart;
  window.addStepForm = addStepForm;
  window.removeStepForm = removeStepForm;
  window.setNewMeeting = setNewMeeting;
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.toggleSound = toggleSound;
});
