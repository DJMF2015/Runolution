import React, { useState } from 'react';
import styled from 'styled-components';
const Search = ({
  className,
  placeholder,
  searchTxt,
  updateSearchTxt,
  'aria-label': ariaLabel,
}) => {
  const [searchInput, setSearchTerm] = useState(searchTxt || '');
  const inputValue = searchTxt !== undefined ? searchTxt : searchInput;

  const handleChange = (event) => {
    const nextValue = event.target.value;

    setSearchTerm(nextValue);
    updateSearchTxt(nextValue);
  };
  return (
    <StyledInput>
      <SearchInput
        className={className}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        aria-label={ariaLabel}
        onChange={handleChange}
      />
    </StyledInput>
  );
};
const SearchInput = styled.input`
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0 0.85rem;
  box-sizing: border-box;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  color: #111827;
  font-size: 0.92rem;
  font-weight: 700;
  outline: none;
  box-shadow: 0 10px 22px rgba(2, 6, 23, 0.22);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    border-color: #fc5200;
    box-shadow:
      0 0 0 3px rgba(252, 82, 0, 0.24),
      0 10px 22px rgba(2, 6, 23, 0.22);
  }
`;

const StyledInput = styled.div`
  width: 100%;
  position: relative;
  &.inputWithIcon {
    position: relative;
  }

  @media screen and (max-width: 600px) {
  }
`;

export default Search;
