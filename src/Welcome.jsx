import {useState, useEffect} from "react";
import {useNavigate} from 'react-router-dom';
import {useLocalStorage} from "./useLocalStorage.js";
import {doneContains} from "./shared.js";
import useFetch from './useFetch.js';

export default function Welcome() {
  const [predmet, setPredmet] = useState("matematika");
  const [trida, setTrida] = useState();
  const [cviceni, setCviceni] = useState();

  const {data: dataTridy, loading: loadingTridy, error: errorTridy, myFetch: myFetchTridy} =
    useFetch(import.meta.env.VITE_API_BASE_URL + 'api/' + predmet + '/seznam_tridy');

  const {data: dataCviceni, loading: loadingCviceni, error: errorCviceni, myFetch: myFetchCviceni} =
    useFetch(import.meta.env.VITE_API_BASE_URL + 'api/' + predmet + '/seznam_cviceni/' + trida, false);

  const [firstLoad, setFirstLoad] = useState(true);

  let navigate = useNavigate();

  const [done, setDone] = useLocalStorage("done", JSON.stringify([]));
  const [next, setNext] = useLocalStorage("next", JSON.stringify({}));

  useEffect(() => {
    // Set Trida that's next. next is set upon completion of a Cviceni.
    dataTridy && setTrida(firstLoad && next && next.hasOwnProperty('trida')
      ? next.trida
      : Object.keys(dataTridy)[0]);
  }, [dataTridy, loadingTridy]);

  useEffect(() => {
    trida && myFetchCviceni();
  }, [trida]);

  useEffect(() => {
    // Set Cviceni that's next. next is set upon completion of a Cviceni.
    dataCviceni && setCviceni((firstLoad && next && next.hasOwnProperty('cviceni')) || next.trida === trida
      ? next.cviceni
      : Object.keys(dataCviceni)[0]);
    setFirstLoad(false);
  }, [dataCviceni, loadingCviceni]);

  function onStart() {
    navigate("/" + predmet + "/" + trida + "/" + cviceni)
  }

  function onChangeTrida(event) {
    setTrida(event.target.value)
  }

  function onChangeCviceni(event) {
    setCviceni(event.target.value)
  }

  return (
    <main id="welcome">
      <table>
        <tbody>

        <tr>
          <td><label>Předmět:</label></td>
          <td>
            <select id="predmet" className="empty" disabled>
              <option value="matematika">Matematika</option>
            </select>
          </td>
        </tr>

        <tr>
          <td><label>Třída:</label></td>
          <td>
            {dataTridy &&
              <select onChange={onChangeTrida} value={trida}>{
                Object.keys(dataTridy).map(id => (
                  <option key={id} value={id}>{dataTridy[id]}</option>))
              }</select>
            }
            {loadingTridy && <p className="loading">Nahrávám...</p>}
            {errorTridy && <p className="error">Chyba: {errorTridy.message}</p>}
          </td>
        </tr>

        <tr>
          <td><label>Cvičení:</label></td>
          <td>
            {dataCviceni && (
              <select onChange={onChangeCviceni} value={cviceni}>{
                Object.keys(dataCviceni).map(id => {
                    let passed = doneContains(done, {predmet: predmet, trida: trida, cviceni: id});
                    let className = passed ? "passed" : "";
                    let mark = passed ? " ✔" : "" // For: 1. Accessibility, 2. Firefox and Chrome Mobile don't set the background with pure CSS (only programmatically)
                    return (
                      <option key={id} value={id} className={className}>{id}: {dataCviceni[id]}{mark}</option>
                    )
                  }
                )
              }
              </select>
            )}
            {loadingCviceni && <p className="loading">Nahrávám...</p>}
            {errorCviceni && <p className="error">Chyba: {errorCviceni.message}</p>}
          </td>
        </tr>

        </tbody>
      </table>

      <img
        id="start"
        className="icon"
        onClick={onStart}
        src="/images/play_arrow_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg"
        alt="Start"/>
    </main>
  );
}
