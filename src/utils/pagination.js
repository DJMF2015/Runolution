import React from 'react';
import styled from 'styled-components';
import { ArrowRight } from '@styled-icons/bootstrap/ArrowRight';
import { ArrowLeft } from '@styled-icons/bootstrap/ArrowLeft';

const Pagination = ({ onPageChange, paginationIndex, totalPages }) => {
  const isFirstPage = paginationIndex <= 1;
  const isLastPage = paginationIndex >= totalPages;

  const handleBackArrow = () => {
    if (isFirstPage) {
      return;
    }
    onPageChange(paginationIndex - 1);
  };

  const handleNextArrow = () => {
    if (isLastPage) {
      return;
    }
    onPageChange(paginationIndex + 1);
  };

  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <Wrapper>
      <ArrowButton
        type="button"
        onClick={handleBackArrow}
        disabled={isFirstPage}
        aria-label="Previous page"
      >
        <ArrowIconBack />
      </ArrowButton>

      <PageInfo>
        Page {paginationIndex} of {totalPages}
      </PageInfo>

      <ArrowButton
        type="button"
        onClick={handleNextArrow}
        disabled={isLastPage}
        aria-label="Next page"
      >
        <ArrowIconRight />
      </ArrowButton>
    </Wrapper>
  );
};

export default Pagination;

const Wrapper = styled.nav`
  width: min(100%, 420px);
  margin: 1.5rem auto 0;
  padding: 0.75rem;
  /* background-color: ghostwhite; */
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.6rem, 3vw, 1.5rem);

  @media screen and (max-width: 520px) {
    width: calc(100% - 1rem);
    padding: 0.55rem;
    gap: 0.5rem;
  }

  @media screen and (max-width: 360px) {
    border-radius: 18px;
  }
`;

const ArrowButton = styled.button`
  width: clamp(42px, 12vw, 58px);
  height: clamp(42px, 12vw, 58px);
  border: none;
  border-radius: 50%;
  background-color: #fc5200;
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    opacity 0.18s ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    background-color: #ff6b35;
    transform: translateY(-2px);
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  @media screen and (max-width: 360px) {
    width: 40px;
    height: 40px;
  }
`;

const PageInfo = styled.span`
  color: #f8fafc;
  font-size: clamp(0.78rem, 2.8vw, 0.95rem);
  font-weight: 700;
  white-space: nowrap;
`;

const ArrowIconRight = styled(ArrowRight)`
  color: white;
`;

const ArrowIconBack = styled(ArrowLeft)`
  color: white;
`;
