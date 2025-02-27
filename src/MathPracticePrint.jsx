import {useEffect, useState} from "react";
import {useParams, useSearchParams} from "react-router-dom";
import {dataToString} from "./shared.js";

export default function MathPracticePrint() {

  const [exercises, setExercises] = useState();

  const [predmet, setPredmet] = useState("matematika");
  let {trida} = useParams();
  let {cviceni} = useParams();

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetch(import.meta.env.VITE_API_BASE_URL + 'api/' + predmet + '/' + trida + '/' + cviceni + '/tisk')
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        setExercises(data);
        setTimeout(() => window.print(), 1);
      })
  }, []);

  return exercises !== undefined ? (
    <div id="print" onLoad="window.print()">
      <h1>{exercises.nazev_cviceni}</h1>

      {Object.values(exercises.priklady).map(priklad => {
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
    </div>
  ) : (
    <div>Nahrávám</div>
  );
}
