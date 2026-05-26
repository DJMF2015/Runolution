import React from 'react';
import styled from 'styled-components';
import { getSecondstoMinutes } from '../utils/conversion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#111',
        boxWidth: 12,
        padding: 10,
        font: {
          size: 11,
        },
      },
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#333',
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        maxTicksLimit: 5,
      },
      grid: {
        color: '#eeeeee',
      },
    },
    y: {
      ticks: {
        color: '#333',
        maxTicksLimit: 5,
      },
      grid: {
        color: '#eeeeee',
      },
      title: {
        display: true,
        text: 'Elapsed Time',
        color: '#333',
      },
    },
  },
};

export default function BestEffortsChart({ props }) {
  const bestEfforts = props?.best_efforts || [];
  if (!bestEfforts.length) {
    return <EmptyChart>No best efforts data available for this activity.</EmptyChart>;
  }

  const labels = bestEfforts.map((effort) => effort.name);

  const elapsedTimes = bestEfforts.map((effort) => {
    const mins = getSecondstoMinutes(effort.elapsed_time);
    return parseFloat(mins);
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Elapsed Time (mins)',
        data: elapsedTimes,
        fill: true,
        borderColor: '#fc5200',
        backgroundColor: 'rgba(252, 82, 0, 0.18)',
        pointBackgroundColor: '#fc5200',
        pointBorderColor: '#fc5200',
        tension: 0.35,
        borderWidth: 3,
      },
    ],
  };

  return (
    <ChartWrapper>
      <Line data={data} options={options} />
    </ChartWrapper>
  );
}

const ChartWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  height: 300px;
  min-width: 0;
  position: relative;
  overflow: hidden;

  canvas {
    max-width: 100%;
  }

  @media screen and (max-width: 700px) {
    height: 250px;
  }

  @media screen and (max-width: 420px) {
    height: 230px;
  }
`;

const EmptyChart = styled.div`
  width: 100%;
  max-width: 100%;
  height: 300px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  text-align: center;
  color: #666;
  background: #fff;
  border-radius: 12px;

  @media screen and (max-width: 700px) {
    height: 250px;
  }
`;
