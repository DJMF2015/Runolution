import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: 'PaceZone',
    },
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      grid: {
        drawOnChartArea: true,
      },
    },
  },
};

export default function PaceZoneChart(props) {
  console.log(props);
  const heartRate = props.props.splits_standard
    ? props.props.splits_standard.map((lap) => lap.average_heartrate)
    : [];
  console.log(heartRate);
  const elevation = props.props.splits_standard
    ? props.props.splits_standard.map((lap) => lap.elevation_difference)
    : [];
  const lapNameLabels = props.props.splits_standard
    ? props.props.splits_standard.map((lap) => lap.split)
    : [];
  console.log(elevation);
  const average_watts = props.props.laps
    ? props.props.laps.map((segment) => segment.average_watts)
    : [];

  const data = {
    labels: lapNameLabels,

    datasets: [
      {
        label: heartRate !== undefined ? 'Average Heartrate' : '',
        data: heartRate,
        borderColor: 'blue',
        backgroundColor: 'red',
        borderWidth: 2,
        yAxisID: 'y', // Left y-axis
      },
      {
        label: elevation !== undefined ? 'Elevation Difference' : '',
        data: elevation,
        borderColor: 'green',
        backgroundColor: 'orange',
        borderWidth: 2,
        yAxisID: 'y1', // Right y-axis
      },
      {
        label: average_watts !== undefined ? 'Average Watts' : '',
        data: average_watts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 159, 64, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(54, 162, 235, 0.2)',
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <div style={{ marginBottom: '-300px' }}>
        <div className="chart" style={{ width: '50vw', height: '330px' }}></div>
        <div
          className="chart"
          style={{
            width: '50vw',
            height: '300px',
            display: 'flex',
            position: 'relative',
            left: '50vw',
            bottom: '300px',
          }}
        >
          <Line
            data={data}
            width={100}
            height={100}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
    </>
  );
}
