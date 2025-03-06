import {useEffect, useState} from "react";
import {useParams, useSearchParams} from "react-router-dom";
import {dataToString} from "./shared.js";
import useFetch from "./useFetch.js";

export default function MathPracticePrint() {

  const [predmet, setPredmet] = useState("matematika");
  let {trida} = useParams();
  let {cviceni} = useParams();

  const {data: dataCviceni, loading: loadingCviceni, error: errorCviceni, myFetch: myFetchCviceni} =
    useFetch(import.meta.env.VITE_API_BASE_URL + 'api/' + predmet + '/' + trida + '/' + cviceni + '/tisk');

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (dataCviceni == null) return;

    if (errorCviceni == null) {
      window.print();
    }
  }, [dataCviceni]);

  return (
    <>
    {dataCviceni && (
      <div id="print" onLoad="window.print()">
        <h1>{dataCviceni.nazev_cviceni}</h1>

        {Object.values(dataCviceni.priklady).map(priklad => {
          return (
            <div>{dataToString(priklad)}</div>
          )
        })}

        {searchParams.get("axis") &&
          <img
            id="axis"
            src="/images/axis.svg"
            alt="Numeric axis"/>
        }
      </div>)}
      {loadingCviceni && <p className="loading">Nahrávám...</p>}
      {errorCviceni && <p className="error">Chyba: {errorCviceni.message}</p>}
    </>
  )
}
