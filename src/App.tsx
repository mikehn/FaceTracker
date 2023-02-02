import { useEffect, useState } from 'react';
import { ReactP5Wrapper } from 'react-p5-wrapper';
import faceTracker, { Person, People } from './FaceTracker';
import './App.css';

interface ActiveData {
  from: Date;
  to: Date;
}

function getTimeDiff(active: ActiveData): string {
  const endDate = active.to;
  const startDate = active.from;
  let timeDiff = endDate.getTime() - startDate.getTime();

  let hours = Math.floor(timeDiff / (1000 * 60 * 60));
  let minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  //console.log(hours + ' hours and ' + minutes + ' minutes');
  return hours + ' hours, ' + minutes + ' minutes, ' + seconds + ' seconds';
}

const activeData: { [id: string]: ActiveData[] } = {};
const SAMPLE_INTERVAL = 4000;
function App() {
  const [updateCounter, setCounter] = useState(0);
  const [peopleData, setPData] = useState<People>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((c) => (c + 1) % 1000);
      //console.log('ACTIVE:', activeData);
    }, SAMPLE_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const updatePData = (pData: People) => {
    let currentTime;
    Object.values(pData).forEach((p) => {
      if (!activeData[p.match]) {
        currentTime = new Date();
        activeData[p.match] = [{ from: currentTime, to: currentTime }];
      } else if (p.isOn) {
        const INTER_DELTA = 14;
        currentTime = new Date();
        let aList = activeData[p.match];
        let lastActive = aList[aList.length - 1];
        const diffSec =
          (currentTime.getTime() - lastActive.to.getTime()) / 1000;
        console.log(diffSec);
        if (diffSec < INTER_DELTA) {
          lastActive.to = currentTime;
        } else {
          aList.push({
            from: currentTime,
            to: currentTime,
          });
        }
      }
    });
    setPData(pData);
  };

  return (
    <div className="App">
      <div className="top-row">
        <ReactP5Wrapper
          sketch={faceTracker}
          onDetection={updatePData}
          update={updateCounter}
        />
        <div className="room">
          {Object.values(peopleData)
            .filter(({ isOn }) => isOn)
            .map((p, i) => {
              let picXP = ((p.midX / 1280) * 80).toFixed(1);
              let picYP = ((p.midY / 720) * 20).toFixed(1);
              return (
                <div
                  className="dot"
                  style={{ left: picXP + '%', top: picYP + '%' }}
                >
                  {p.match}
                </div>
              );
            })}

          <img src="/FaceTracker/public/floorPlan2.png" />
        </div>
      </div>
      <div className="info">
        <h2>Info</h2>
        <div>
          <div className="gen-stat"></div>
          <div className="active-list">
            {Object.values(peopleData)
              .filter(({ isOn }) => isOn)
              .map((p, i) => {
                let aList = activeData[p.match];
                let lastActive =
                  aList?.length > 0
                    ? getTimeDiff(aList[aList.length - 1])
                    : 'No data';
                return (
                  <div key={p.match} className="data-list">
                    <span className="data-index">{i}</span>
                    <span>id: {p.match} </span>
                    <span>age: {p.data?.age} </span>
                    <span>mood: {p.data?.mood} </span>
                    <span>active: {lastActive}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
