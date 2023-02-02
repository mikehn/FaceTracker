//import * as p5 from 'p5';
//import 'p5/lib/addons/p5.dom';
import * as faceApi from 'face-api.js';
import { LabeledFaceDescriptors } from 'face-api.js';

export interface Person {
  midX: number;
  midY: number;
  distance: number;
  match: string;
  d: Float32Array[];
  isOn: boolean;
  data?: { age: string; mood: string };
}

export interface People {
  [label: string]: Person;
}

const MODEL_URL = '/FaceTracker/models';
let faceDrawings = [];
let counter = 1;
let faceMatcher: any;

let people: People = {};

export default function sketch(p: any) {
  console.log('P', p);

  let capture: any = null;
  let faceDrawings: any[] = [];

  // function showFaceDetectionData(data: any) {
  //   faceDrawings = data;
  // }

  p.updateWithProps = (props: any) => {
    props.onDetection(people);
  };

  function calcDistance(midX: number, midY: number, person: Person): number {
    let xsqr = Math.pow(person.midX - midX, 2);
    let ysqr = Math.pow(person.midY - midY, 2);
    return Number(Math.sqrt(xsqr + ysqr).toFixed(2));
  }

  function findMinDistancePerson(midX: number, midY: number): Person | null {
    let minDistance = 100;
    let minPerson: Person = {
      distance: 100,
      midX: 0,
      midY: 0,
      match: 'unknown',
      d: [],
      isOn: true,
    };
    Object.values(people).forEach((person) => {
      let distance = calcDistance(midX, midY, person);
      if (distance < minDistance) {
        minDistance = distance;
        minPerson = person;
      }
    });
    console.log('MIN DIS:', minDistance);
    if (minDistance < 30) {
      minPerson.distance = minDistance;
      return minPerson;
    }
    return null;
  }

  function detection(res: any): Person {
    let isUpdated = false;
    let midX = res.detection.box._x + res.detection.box._width / 2;
    let midY = res.detection.box._y + res.detection.box._height / 2;
    let currentPerson: Person;
    if (!faceMatcher) {
      faceMatcher = new faceApi.FaceMatcher([
        new faceApi.LabeledFaceDescriptors('P1', [res.descriptor]),
      ]);
      currentPerson = {
        midX,
        midY,
        distance: 100,
        match: 'P1',
        d: [res.descriptor],
        isOn: true,
      };
      people['P1'] = currentPerson;
    } else {
      const bestMatch = faceMatcher.findBestMatch(res.descriptor);
      if (bestMatch._label == 'unknown') {
        let bestPerson = findMinDistancePerson(midX, midY);
        if (bestPerson) {
          currentPerson = bestPerson;
          if (bestPerson.d.length < 40) {
            isUpdated = true;
            bestPerson.d.push(res.descriptor);
          }
        } else {
          isUpdated = true;
          let newP: Person = {
            midX,
            midY,
            match: `P${++counter}`,
            d: [res.descriptor],
            distance: 100,
            isOn: true,
          };
          people[newP.match] = newP;
          currentPerson = newP;
        }
      } else {
        currentPerson = people[bestMatch._label];
        currentPerson.distance = calcDistance(midX, midY, currentPerson);
        if (currentPerson.d.length < 40) {
          isUpdated = true;
          currentPerson.d.push(res.descriptor);
        }
      }
    }
    if (isUpdated) pushNewDescriptors();
    currentPerson.midX = midX;
    currentPerson.midY = midY;
    currentPerson.isOn = true;
    return currentPerson;
  }

  function pushNewDescriptors() {
    let labledDescriptors: any = [];
    Object.values(people).forEach((person) => {
      labledDescriptors.push(
        new faceApi.LabeledFaceDescriptors(person.match, person.d)
      );
    });
    faceMatcher = new faceApi.FaceMatcher(labledDescriptors);
  }

  p.setup = async function () {
    await faceApi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceApi.loadFaceLandmarkModel(MODEL_URL);
    await faceApi.loadFaceRecognitionModel(MODEL_URL);
    await faceApi.loadFaceExpressionModel(MODEL_URL);
    await faceApi.loadSsdMobilenetv1Model(MODEL_URL);
    await faceApi.loadAgeGenderModel(MODEL_URL);
    await faceApi.loadFaceExpressionModel(MODEL_URL);

    console.log('Loaded');

    p.createCanvas(1280, 720);
    const constraints = {
      video: {
        mandatory: {
          minWidth: 1280,
          minHeight: 720,
        },
        // optional: [{ maxFrameRate: 40 }],
      },
      audio: false,
    };

    capture = p.createCapture(constraints, () => {});

    capture.id('video_element');
    capture.size(1280, 720);
    capture.hide();
  };

  p.draw = async () => {
    if (!capture) {
      return;
    }
    p.background(255);
    p.image(capture, 0, 0);
    p.fill(0, 0, 0, 0);
    ///////////////////
    Object.values(people).forEach((p) => (p.isOn = false));
    faceDrawings.map((drawing) => {
      if (drawing) {
        let current = detection(drawing);
        // let midX = Number(
        //   drawing.detection.box._x + drawing.detection.box._width / 2
        // ).toFixed(1);
        // let midY = Number(
        //   drawing.detection.box._y + drawing.detection.box._height / 2
        // ).toFixed(1);

        p.strokeWeight(2);
        p.textSize(25);
        const textX = drawing.detection.box._x + drawing.detection.box._width;
        const textY = drawing.detection.box._y + drawing.detection.box._height;

        const name = `Name: ${current.match}`;
        const nWidth = p.textWidth(name);
        p.text(
          name,
          textX - nWidth - 10,
          textY - drawing.detection.box._height - 20
        );

        p.textSize(15);
        p.strokeWeight(1);
        const confidencetext = `Gender: ${drawing.gender}`;
        const textWidth = p.textWidth(confidencetext);
        p.text(confidencetext, textX - textWidth - 10, textY - 60);

        const agetext = 'Age: ' + drawing.age.toFixed(0);
        const ageTextWidth = p.textWidth(agetext);
        p.text(agetext, textX - ageTextWidth - 10, textY - 30);

        const copiedExpression = drawing.expressions;
        const expressions = Object.keys(copiedExpression).map((key) => {
          const value = copiedExpression[key];
          return value;
        });

        const max = Math.max(...expressions);

        const expression_value = Object.keys(copiedExpression).filter((key) => {
          return copiedExpression[key] === max;
        })[0];

        const expressiontext = 'Mood: ' + expression_value;
        const expressionWidth = p.textWidth(expressiontext);
        p.text(expressiontext, textX - expressionWidth - 10, textY - 10);

        p.strokeWeight(4);
        p.stroke('rgb(100%,100%,100%)');
        p.rect(
          drawing.detection.box._x,
          drawing.detection.box._y,
          drawing.detection.box._width,
          drawing.detection.box._height
        );
        current.data = { age: drawing.age.toFixed(0), mood: expression_value };
      }
    });

    faceApi
      .detectAllFaces(capture.id())
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withAgeAndGender()
      .withFaceExpressions()
      //@ts-ignore
      .then((data: any) => {
        faceDrawings = data;
      });
  };
}
