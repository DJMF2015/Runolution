import React from 'react';
import styled from 'styled-components';
import { ArrowRight } from '@styled-icons/bootstrap/ArrowRight';
import { ArrowLeft } from '@styled-icons/bootstrap/ArrowLeft';

const Pagination = ({ onPageChange, pageIndex }) => {
  // previous
  const handleBackArrow = () => {
    console.log(pageIndex);
    if (pageIndex === 1) {
      return onPageChange(1);
    }
    onPageChange(pageIndex === 0 ? 1 : pageIndex - 1);
  };

  // next
  const handleNextArrow = () => {
    console.log(pageIndex);
    if (onPageChange === 1) {
      return 1;
    }
    onPageChange(pageIndex === 0 ? 1 : pageIndex + 1);
  };

  return (
    <>
      <Wrapper>
        {
          <ArrowIconBack
            style={{
              height: '65px',
              width: '85px',
            }}
            onClick={handleBackArrow}
          ></ArrowIconBack>
        }

        {
          <ArrowIconRight
            style={{
              height: '65px',
              width: '85px',
            }}
            onClick={handleNextArrow}
          ></ArrowIconRight>
        }
      </Wrapper>
    </>
  );
};
const ArrowIconRight = styled(ArrowRight)`
  color: black;
  margin-left: 75vw;
  margin-top: -5em;
  margin-bottom: 2rem;
`;
const ArrowIconBack = styled(ArrowLeft)`
  color: black;
  margin-left: 15vw;
  margin-bottom: 1rem;
`;

const Wrapper = styled.div`
  ${ArrowIconRight} ,${ArrowIconBack} {
    &:hover,
    &:focus {
      box-shadow: 0 10px 20px -5px rgba(0.7, 1, 1, 0.35);
      border-radius: 100px;
      background-color: ghostwhite;
    }
  }
`;
export default Pagination;
