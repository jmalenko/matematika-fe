import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from 'react-router-dom';
import {useLocalStorage} from "./useLocalStorage";
import {doneContains, dataToString} from "./shared.js";
import Log from "./Log.jsx";
import useFetch from "./useFetch.js";

export default function MathPractice() {
  const EMPTY = "";
  const MAX_LENGTH = 2;

  const NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL = import.meta.env.PROD ? 10 : 3; // This is used with current state, so the state will have old value, the actual value is higher by 1.
  const NUMBER_OF_CORRECT_EXERCISES_TO_GET_TO_NEXT_LEVEL = NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL - 1;

  const LOG_MAX_LENGTH = 1000;

  const STATE_THINKING = 1;
  const STATE_ANSWERED = 2;
  const STATE_LOADING = 3;
  const STATE_LOADING_NEXT = 4;
  const STATE_END = 5;

  const INDICATOR_TIMEOUT = import.meta.env.PROD ? 2000 : 200;
  const STATUS_TIMEOUT = import.meta.env.PROD ? 3000 : 300;

  const state = useRef(STATE_LOADING);
  const exerciseNextRef = useRef();

  const [predmet, setPredmet] = useState("matematika");
  let {trida} = useParams();
  let {cviceni} = useParams();

  const [exercise, setExercise] = useState();
  const {data: dataExercise, loading: loadingExercise, error: errorExercise, myFetch: myFetchExercise} =
    useFetch(import.meta.env.VITE_API_BASE_URL + 'api/' + predmet + '/' + trida + '/' + cviceni);
  const [answer, setAnswer] = useState(); // answer entered by user, string

  const {data: dataCviceniInfo, loading: loadingCviceniInfo, error: errorCviceniInfo, myFetch: myFetchCviceniInfo} =
    useFetch(import.meta.env.VITE_API_BASE_URL + 'api/' + predmet + '/info_cviceni/' + trida + '/' + cviceni);

  const [dataCviceniInfoPrev, setDataCviceniInfoPrev] = useState();

  const [exerciseNext, setExerciseNext] = useState();

  const [menuVisible, setMenuVisible] = useState(false);
  const [incorrectAnswers, setIncorrectAnswers] = useState(); // Incorrect answers for the current exercise
  const [timeFrom, setTimeFrom] = useState();
  const [history, setHistory] = useState();

  const [message, setMessage] = useState();

  const [cviceniInfo, setCviceniInfo] = useState();

  let navigate = useNavigate();

  const [log, setLog] = useLocalStorage("log", []);
  const [done, setDone] = useLocalStorage("done", []); // Set stored as array
  const [next, setNext] = useLocalStorage("next", {}); // TODO Consider getting next from done (as the first item that's not done)

  useEffect(() => {
    setLog(log => [...log, {
      timestamp: Date().valueOf(),
      predmet: cviceniInfo != null ? cviceniInfo.nazev_predmet : predmet,
      trida: trida + (cviceniInfo != null ? ": " + cviceniInfo.nazev_trida : ""),
      cviceni: cviceni + (cviceniInfo != null ? ": " + cviceniInfo.nazev_cviceni : ""),
      event: "Start",
      exercise: "",
      answerExpected: "",
      answerActual: "",
      correctIndicator: "",
      duration: ""
    }]);
  }, []);

  useEffect(() => {
    document.documentElement.requestFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document
          .exitFullscreen()
          // .then(() => console.log("Exited from Full screen mode"))
          .catch((err) => console.error(err));
      }
    };
  }, []);

  useEffect(() => {
    if (dataExercise == null)
      return;

    if (import.meta.env.DEV)
      console.debug("Data: " + JSON.stringify(dataExercise));

    if (state.current == STATE_LOADING) { // 1st exercise
      console.log("New exercise: " + dataToString(dataExercise));
      state.current = STATE_THINKING;
      setExercise(dataExercise);
      setAnswer(EMPTY);
      setIncorrectAnswers([]);
      const now = new Date();
      setTimeFrom(now);
      setHistory([]);

      // Fetch next exercise
      myFetchExercise();

      // Trim log
      if (LOG_MAX_LENGTH < log.length) {
        setLog(log => log.slice(-LOG_MAX_LENGTH));
      }

      setLog(log => [...log, {
        timestamp: now.valueOf(),
        predmet: cviceniInfo != null ? cviceniInfo.nazev_predmet : predmet,
        trida: trida + (cviceniInfo != null ? ": " + cviceniInfo.nazev_trida : ""),
        cviceni: cviceni + (cviceniInfo != null ? ": " + cviceniInfo.nazev_cviceni : ""),
        event: "Nový příklad",
        exercise: dataToString(dataExercise),
        answerExpected: "",
        answerActual: "",
        correctIndicator: "",
        duration: ""
      }]);
    } else { // use this exercise after the current exercise
      console.log("Next exercise: " + dataToString(dataExercise));
      setExerciseNext(dataExercise);
    }
  }, [dataExercise]);

  useEffect(() => {
    exerciseNextRef.current = exerciseNext;
  }, [exerciseNext]);

  function onAddDigit(digit) {
    if (state.current != STATE_THINKING) return;

    console.debug("Add digit: " + answer + " + " + digit);
    if (answer.length < MAX_LENGTH || answer.length < exercise.zadani[exercise.neznama].toString().length) {
      setAnswer(answer + digit);
    } else {
      setMessage("Není povoleno zadat příliš dlouhé číslo")
    }
  }

  function onSubmit() {
    if (state.current != STATE_THINKING)
      return;
    if (answer.length === 0) {
      setMessage("Musíš zadat číslo")
      return
    }

    state.current = STATE_ANSWERED;
    const now = new Date();
    const timeTo = now;
    const timeDiff = timeTo.getTime() - timeFrom.getTime();
    if (isCorrect()) {
      console.log("Correct answer");

      setHistory([...history, [exercise, incorrectAnswers, timeDiff]]);

      setLog(log => [...log, {
        timestamp: now.valueOf(),
        predmet: cviceniInfo != null ? cviceniInfo.nazev_predmet : predmet,
        trida: trida + (cviceniInfo != null ? ": " + cviceniInfo.nazev_trida : ""),
        cviceni: cviceni + (cviceniInfo != null ? ": " + cviceniInfo.nazev_cviceni : ""),
        event: "Odpověď",
        exercise: dataToString(exercise),
        answerExpected: exercise.zadani[Number(exercise.neznama)],
        answerActual: answer,
        correctIndicator: "Správně",
        duration: timeDiff
      }]);

      let moveToNextLevel_ = moveToNextLevel(incorrectAnswers);
      if (moveToNextLevel_) {
        console.log("Next level: " + (dataCviceniInfo.next_cviceni.end ? "END" : dataCviceniInfo.next_cviceni.id + ": " + dataCviceniInfo.next_cviceni.nazev));

        let el = {predmet: predmet, trida: trida, cviceni: cviceni};
        if (!doneContains(done, el)) {
          setDone([...done, el]);
        }

        setLog(log => [...log, {
          timestamp: now.valueOf(),
          predmet: dataCviceniInfo != null ? dataCviceniInfo.nazev_predmet : predmet,
          trida: trida + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_trida : ""),
          cviceni: cviceni + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_cviceni : ""),
          event: "Další cvičení" + (dataCviceniInfo.next_cviceni.end ? ", ale už je konec třídy" : ""),
          exercise: "",
          answerExpected: "",
          answerActual: "",
          correctIndicator: "",
          duration: ""
        }]);

        setNext({
          predmet: predmet,
          trida: trida,
          cviceni: dataCviceniInfo.next_cviceni.id,
          end: dataCviceniInfo.next_cviceni.end
        });
      }

      setTimeout(() => {
        if (moveToNextLevel_) {
          console.debug("Timeout for answer indicator");
          if (dataCviceniInfo.next_cviceni.end) { // TODO Check that dataCviceniInfo is set
            console.info("This was the last exercise");
            state.current = STATE_END;
            setExerciseNext(null); // set some state variable to force rerender
          } else {
            setDataCviceniInfoPrev(dataCviceniInfo)
            navigate("/" + predmet + "/" + trida + "/" + dataCviceniInfo.next_cviceni.id);
            state.current = STATE_LOADING_NEXT;
          }
          return;
        }

        if (exerciseNextRef.current != null) {
          state.current = STATE_THINKING;
          setExercise(exerciseNextRef.current);
          setExerciseNext(null);
          setAnswer(EMPTY);
          setIncorrectAnswers([]);
          setTimeFrom(new Date());

          // Fetch next exercise
          myFetchExercise();

          setLog(log => [...log, {
            timestamp: Date().valueOf(),
            predmet: dataCviceniInfo != null ? dataCviceniInfo.nazev_predmet : predmet,
            trida: trida + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_trida : ""),
            cviceni: cviceni + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_cviceni : ""),
            event: "Nový příklad",
            exercise: dataToString(exerciseNextRef.current),
            answerExpected: "",
            answerActual: "",
            correctIndicator: "",
            duration: ""
          }]);
        } else {
          console.debug("Loading exercise");
          state.current = STATE_LOADING;
        }
      }, INDICATOR_TIMEOUT);
    } else {
      let expectedAnswer = Number(exercise.zadani[Number(exercise.neznama)]);
      let actualAnswer = Number(answer);
      console.log("Incorrect answer. Expected: " + expectedAnswer + ", actual: " + actualAnswer);

      setIncorrectAnswers([...incorrectAnswers, actualAnswer]);

      setLog(log => [...log, {
        timestamp: now.valueOf(),
        predmet: dataCviceniInfo != null ? dataCviceniInfo.nazev_predmet : predmet,
        trida: trida + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_trida : ""),
        cviceni: cviceni + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_cviceni : ""),
        event: "Odpověď",
        exercise: dataToString(exercise),
        answerExpected: expectedAnswer,
        answerActual: actualAnswer,
        correctIndicator: "Chyba",
        duration: timeDiff
      }]);

      setTimeout(() => {
        state.current = STATE_THINKING;
        setAnswer(EMPTY);
      }, INDICATOR_TIMEOUT);
    }
  }

  function isCorrect() {
    if (![STATE_THINKING, STATE_ANSWERED].includes(state.current))
      return false;

    let expectedAnswer = Number(exercise.zadani[Number(exercise.neznama)]);
    let actualAnswer = Number(answer);
    let correct = expectedAnswer === actualAnswer;
    return correct
  }

  function moveToNextLevel(incorrectAnswersCurrent) {
    if (history.length + 1 < NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL) // +1 because the actual state is passed in parameter
      return false;

    let correct = 0;
    let correctString = "";
    let from = Math.max(history.length - NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL + 1, 0)
    for (let i = from; i < history.length; i++) {
      const incorrectAnswers = history[i][1].length;
      if (incorrectAnswers === 0) {
        correct++;
        correctString += ".";
      } else {
        correctString += "X";
      }
    }
    if (incorrectAnswersCurrent.length) {
      correctString += "X";
    } else {
      correct++;
      correctString += ".";
    }

    let moveToNextLevel = NUMBER_OF_CORRECT_EXERCISES_TO_GET_TO_NEXT_LEVEL <= correct;
    console.debug((moveToNextLevel ? "Move to next level" : "Don't move to next level") + ". Correct " + correct + " out of " + NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL + ", min is " + NUMBER_OF_CORRECT_EXERCISES_TO_GET_TO_NEXT_LEVEL + ", summary: " + correctString);
    return moveToNextLevel;
  }

  function countCorrectInLast() {
    let correct = 0;
    let from = Math.max(history.length - NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL, 0)
    for (let i = from; i < history.length; i++) {
      const incorrectAnswers = history[i][1].length;
      if (incorrectAnswers === 0)
        correct++;
    }

    return correct;
  }

  function onDelete() {
    if (state.current !== STATE_THINKING) return;

    setAnswer(EMPTY);
  }

  function onShowMenu() {
    setMenuVisible(!menuVisible);
  }

  function onHome() {
    navigate("/");
  }

  function onRestart() {
    state.current = STATE_LOADING;
    setExercise(null);
    setHistory([]);
  }

  function onContinue() {
    if (exerciseNextRef.current != null) {
      state.current = STATE_THINKING;
      setExercise(exerciseNextRef.current);
      setExerciseNext(null);
      setAnswer(EMPTY);
      setIncorrectAnswers([]);
      setTimeFrom(new Date());
      setHistory([]);

      // Fetch next exercise
      myFetchExercise();

      setLog(log => [...log, {
        timestamp: Date().valueOf(),
        predmet: dataCviceniInfo != null ? dataCviceniInfo.nazev_predmet : predmet,
        trida: trida + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_trida : ""),
        cviceni: cviceni + (dataCviceniInfo != null ? ": " + dataCviceniInfo.nazev_cviceni : ""),
        event: "Nový příklad",
        exercise: dataToString(exerciseNextRef.current),
        answerExpected: exerciseNextRef.current.zadani[Number(exerciseNextRef.current.neznama)],
        answerActual: "",
        correctIndicator: "",
        duration: ""
      }]);
    } else {
      state.current = STATE_LOADING;
    }
  }

// Message

  let timeout = null;

  useEffect(() => {
    if (message != null) {
      clearTimeout(timeout);

      timeout = setTimeout(() => hideStatus(), STATUS_TIMEOUT);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [message]);

  function hideStatus() {
    setMessage(null);
  }

// Physical keys

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);

    return function () {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [answer]);

  const onKeyDown = (event) => {
    switch (state.current) {
      case STATE_THINKING:
        switch (event.key) {
          case "Escape":
            onDelete()
            break;
          case "Backspace":
            setAnswer(answer.substring(0, answer.length - 1));
            break;
          case "a":
            if (import.meta.env.DEV) {
              const expectedAnswer = String(exercise.zadani[Number(exercise.neznama)]);
              setAnswer(expectedAnswer);
            }
            break;
          case "Enter":
            onSubmit()
            break;
          default:
            if (isFinite(event.key)) // test for a digit
              onAddDigit(event.key);
            break;
        }
        break;
      case STATE_LOADING_NEXT:
        switch (event.key) {
          case "Enter":
            onContinue();
            break;
        }
        break;
      case STATE_END:
        switch (event.key) {
          case "Enter":
            onRestart();
            break;
        }
        break;
    }
  }

  return state.current == STATE_LOADING ? (
    <LoadingScreen title=""
                   text1=""
                   text2="Nahrávám cvičení..."/>
  ) : state.current == STATE_LOADING_NEXT ? (
    <GoToNextScreen title={dataCviceniInfoPrev.next_cviceni.nazev}
                    onContinue={onContinue}/>
  ) : state.current == STATE_END ? (
    <EndScreen onRestart={onRestart} onHome={onHome}/>
  ) : menuVisible ? (
    <>
      <MenuScreen onHome={onHome} cviceniCelkem={history.length} spravnychVPoslednich={countCorrectInLast()}
                  minSpravnych={NUMBER_OF_CORRECT_EXERCISES_TO_GET_TO_NEXT_LEVEL} poslednich={NUMBER_OF_TOTAL_EXERCISES_TO_GET_TO_NEXT_LEVEL} log={log}/>
      <ButtonMenu onShowMenu={onShowMenu} isMenuVisible={menuVisible}/>
    </>
  ) : (
    <>
      <Zadani exercise={exercise} answer={answer}
              showCorrect={state.current == STATE_ANSWERED && isCorrect()}
              showIncorrect={state.current == STATE_ANSWERED && !isCorrect()}/>

      <div id="tlacitka">
        <ButtonDigit value={1} onAddDigit={onAddDigit}/>
        <ButtonDigit value={2} onAddDigit={onAddDigit}/>
        <ButtonDigit value={3} onAddDigit={onAddDigit}/>
        <ButtonDigit value={4} onAddDigit={onAddDigit}/>
        <ButtonDigit value={5} onAddDigit={onAddDigit}/>
        <ButtonDigit value={6} onAddDigit={onAddDigit}/>
        <ButtonDigit value={7} onAddDigit={onAddDigit}/>
        <ButtonDigit value={8} onAddDigit={onAddDigit}/>
        <ButtonDigit value={9} onAddDigit={onAddDigit}/>
        <ButtonDigit value={0} onAddDigit={onAddDigit}/>

        <ButtonSubmit onSubmit={onSubmit}/>
        <ButtonDelete onDelete={onDelete}/>
      </div>

      <ButtonMenu onShowMenu={onShowMenu} isMenuVisible={menuVisible}/>

      {message != null &&
        <div id="message">{message}</div>}
    </>
  );
}

function Zadani({exercise, answer, showCorrect, showIncorrect}) {
  // Experimentally set the font-size
  //   exercise.zadani.length     font-size
  //   5                          17
  //   7                          13
  //   9                           9
  const fontSize1 = 17;
  const length1 = 5;
  const deltaPerUnitLength = -2;

  let fontSize = exercise == null ? fontSize1 : (exercise.zadani.length - length1) * deltaPerUnitLength + fontSize1;
  // console.debug("Zadani font-size: " + fontSize);
  const neznamaHeight = fontSize + 3;
  // TODO Other dimensions should be adjusted as well: position of correct/incorrect icons, vertical position of exercise

  return (
    <div id="zadani" style={{"fontSize": fontSize + "vw"}}>
      {exercise != null && Object.keys(exercise.zadani).map(i => (
        i == exercise.neznama ? (
          <span key={i} className="neznama_wrapper">
            <span id="neznama" style={{"height": neznamaHeight + "vw"}}>
              <span>{answer}</span>
            </span>
            <IconCorrect isVisible={showCorrect}/>
            <IconIncorrect isVisible={showIncorrect}/>
          </span>
        ) : (
          <span key={i}>{exercise.zadani[i]}</span>)))
      }
    </div>
  );
}

function ButtonDigit({value, onAddDigit}) {

  function onClick() {
    onAddDigit(value);
  }

  return (
    <span onClick={onClick} className="icon">
      {value}
    </span>
  );
}

function ButtonSubmit({onSubmit}) {
  return (
    <img
      id="submit"
      className="icon"
      onClick={onSubmit}
      src="/images/send_24dp_FILL0_wght400_GRAD0_opsz24.svg"
      alt="Submit"/>
  );
}

function ButtonDelete({onDelete}) {
  return (
    <img
      id="delete"
      className="icon"
      onClick={onDelete}
      src="/images/backspace_24dp_FILL0_wght400_GRAD0_opsz24.svg"
      alt="Delete"/>
  );
}

function ButtonMenu({onShowMenu, isMenuVisible}) {
  return (
    <img
      id="menu"
      className="icon"
      onClick={onShowMenu}
      src={isMenuVisible ? "/images/close_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg" : "/images/menu_24dp_FILL0_wght400_GRAD0_opsz24.svg"}
      alt="Menu"/>
  );
}

function IconCorrect({isVisible}) {
  return isVisible ? (
    <img
      id="correct"
      src="/images/correct__check_24dp_FILL0_wght400_GRAD0_opsz24.svg"
      alt="Correct"/>
  ) : (
    <></>
  );
}

function IconIncorrect({isVisible}) {
  return isVisible ? (
    <img
      id="incorrect"
      src="/images/incorrect__close_24dp_FILL0_wght400_GRAD0_opsz24.svg"
      alt="Incorrect"/>
  ) : (
    <></>
  );
}

function LoadingScreen({title, text1, text2}) {
  return (
    <div id="loading">
      <p>{text1}</p>
      <h3>{title}</h3>
      <p>{text2}</p>
    </div>
  );
}

function GoToNextScreen({title, onContinue}) {
  return (
    <div id="loading">
      <p>Postupil jsi na další cvičení.</p>
      <h3>{title}</h3>

      <img
        id="start"
        className="icon"
        onClick={onContinue}
        src="/images/play_arrow_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg"
        alt="Přejít na další cvičení"/>
    </div>
  );
}

function EndScreen({onRestart, onHome}) {
  return (
    <>
      <div id="loading">
        <p>Výborně!</p>
        <p>Vyřešil jsi všechna cvičení v této třídě.</p>

        <img
          id="start"
          className="icon"
          onClick={onRestart}
          src="/images/play_arrow_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg"
          alt="Spoustit poslední cvičení"/>
      </div>

      <img
        id="home"
        className="icon"
        onClick={onHome}
        src="/images/home_24dp_FILL0_wght400_GRAD0_opsz24.svg"
        alt="Přejít na rozcestník"/>
    </>
  );
}

function MenuScreen({onHome, cviceniCelkem, spravnychVPoslednich, minSpravnych, poslednich, log}) {
  return (
    <div id="menuScreen">
      <div id="state">
        {cviceniCelkem < poslednich ? (
          <p>Máš správně {spravnychVPoslednich} z posledních {poslednich} příkladů. Zatím bylo jen {cviceniCelkem} příkladů.</p>
        ) : (
          <p>Máš správně {spravnychVPoslednich} z posledních {poslednich} příkladů.</p>
        )}
        <p>Pro postup do dalšího cvičení musíš mít správně {minSpravnych} z posledních {poslednich} příkladů.</p>
      </div>

      <Log log={log}/>

      <ButtonHome onHome={onHome}/>
    </div>
  );
}

function ButtonHome({onHome}) {
  return (
    <img
      id="home"
      className="icon"
      onClick={onHome}
      src="/images/home_24dp_FILL0_wght400_GRAD0_opsz24.svg"
      alt="Přejít na rozcestník"/>
  );
}
