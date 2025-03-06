import {useState, useEffect, useCallback} from 'react';
import axios from 'axios';

export default function useFetch(url, fetchOnMount = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const myFetch = useCallback(() => {
    setLoading(true)
    setData(null);
    setError(null);
    const source = axios.CancelToken.source();
    axios.get(url, {cancelToken: source.token})
      .then(res => {
        setLoading(false);
        // Set multiple typical responses for various response formats
        res.data && setData(res.data);
        res.data.content && setData(res.data.content);
        res.content && setData(res.content);
      })
      .catch(err => {
        setLoading(false)
        setError(err)
      })
  }, [url]);

  useEffect(() => {
    if (!fetchOnMount) return;
    myFetch()
  }, [myFetch, fetchOnMount])

  return {data, loading, error, myFetch}
}