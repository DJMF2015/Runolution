import React from 'react';
import styled from 'styled-components';
import { ArrowRight } from '@styled-icons/bootstrap/ArrowRight';
import { ArrowLeft } from '@styled-icons/bootstrap/ArrowLeft';

const Pagination = ({ onPageChange, pageIndex }) => {
  // previous
  const handleBackArrow = () => {
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
  display: inline;
`;
const ArrowIconBack = styled(ArrowLeft)`
  color: black;
  display: inline;
  margin-left: 10rem;
`;

const Wrapper = styled.div`
  background-color: ghostwhite;
  position: relative;
  margin-top: 1rem;
  margin-left: 25rem;
  gap: 20rem;
  display: inline-flex;
  flex-direction: row;
  ${ArrowIconRight} ,${ArrowIconBack} {
    &:hover,
    &:focus {
      box-shadow: 0 1px 10px -5px rgba(0.7, 1, 1, 0.35);
      border-radius: 100px;
      background-color: ghostwhite;
    }
  }
`;
export default Pagination;
