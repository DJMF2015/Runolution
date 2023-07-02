import React from 'react';
import { getSecondstoMinutes } from '../utils/conversion';
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
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: 'Best Efforts',
    },
  },
};

export default function PaceZoneChart(props) {
  const labelNames = props?.props?.best_efforts?.map((effort) => effort.name);

  const elapsedTime = props.props.best_efforts
    ? props.props.laps.map((effort) => effort.elapsed_time)
    : [];
  const formattedElapsedTime = elapsedTime
    .map((time) => {
      const mins = getSecondstoMinutes(time);

      return parseFloat(mins);
    })
    .sort((a, b) => a - b);

  const segment_efforts = props.props.segment_efforts
    ? props.props.segment_efforts.map((segment) => segment.average_watts)
    : [];
  const data = {
    labels: labelNames || [],

    datasets: [
      {
        label: elapsedTime !== undefined ? 'Elapsed Time (mins)' : '',
        data: formattedElapsedTime || [],
        fill: true,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderWidth: 2,
      },
      {
        label: elapsedTime !== undefined ? 'Average Watts (mins)' : '',
        data: segment_efforts || [],
        fill: true,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'red',
        borderWidth: 2,
      },
    ],
  };

  return (
    <>
      <div style={{ marginTop: '-630px', marginLeft: '10px' }}>
        <div className="chart" style={{ width: '50vw', height: '330px' }}>
          <Line width={75} height={50} data={data} options={options} />
        </div>
      </div>
    </>
  );
}
