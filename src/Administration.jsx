import {useNavigate} from 'react-router-dom';
import {useLocalStorage} from "./useLocalStorage.js";
import {useEffect, useState} from "react";
import Log from "./Log.jsx";
import useFetch from "./useFetch.js";

export default function Administration() {

  let navigate = useNavigate();

  function onHome() {
    navigate("/");
  }

  // ===

  const [log, setLog] = useLocalStorage("log", []);

  function onClearLocalStorage(event) {
    setLog([]); // Hack: This is here to update state.

    localStorage.clear(); // Clear localStorage
  }

  // ===

  const {data: dataSeznam, loading: loadingSeznam, error: errorSeznam, myFetch: myFetchSeznam} =
    useFetch(import.meta.env.VITE_API_BASE_URL + 'api/seznam');

  function onPrint(id_predmet, id_trida, id_cviceni) {
    let param = id_predmet == "matematika" && id_trida == 1 && 49 <= id_cviceni ? "?axis=1" : ""
    window.open('/' + id_predmet + '/' + id_trida + '/' + id_cviceni + '/print' + param, '_blank')
  }

  // ===

  return (
    <>
      <ButtonHome onHome={onHome}/>

      <div id="admin">
        <h4>Administrace</h4>

        <h4>Seznam cvičení</h4>
        <Seznam seznam={dataSeznam} loading={loadingSeznam} error={errorSeznam} onPrint={onPrint}/>

        <h4>Log</h4>
        Log má {log.length} položek.
        <button onClick={onClearLocalStorage}>Clear Local Storage</button>
        <Log log={log}/>
      </div>
    </>
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

function Seznam({seznam, loading, error, onPrint}) {
  return (
    <>
      {seznam && (
        <table className="mytablestyle">
          <thead>
          <tr>
            <th>Předmět</th>
            <th>Třída</th>
            <th>Cvičení</th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          {seznam && Object.keys(seznam).map(id_predmet => {
            const predmet = seznam[id_predmet];
            return Object.keys(predmet.tridy).map(id_trida => {
              const trida = predmet.tridy[id_trida];
              return Object.keys(trida.cviceni).map(id_cviceni => {
                const zadani = trida.cviceni[id_cviceni];
                return (
                  <tr key={id_predmet + ":" + id_trida + ":" + id_cviceni}>
                    <td>{id_predmet}: {predmet.nazev_predmet}</td>
                    <td>{id_trida}: {trida.nazev_trida}</td>
                    <td>{id_cviceni}: {zadani.nazev_zadani}</td>
                    <td>
                      <button onClick={() => onPrint(id_predmet, id_trida, id_cviceni)}>Tisk</button>
                    </td>
                  </tr>
                )
              })
            })
          })}
          </tbody>
        </table>)}
      {loading && <p className="loading">Nahrávám...</p>}
      {error && <p className="error">Chyba: {error.message}</p>}
    </>
  );
}
