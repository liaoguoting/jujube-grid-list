import React from 'react';

export interface GridListProps {
  height: number,
  rowHeight:number,
  columnCount: number,
  list: [any],
  listCount: number,
  overscanRowCount: number,
  className?: string,
  outerRef?: (ref:any)=> any,
  itemKey?: ()=>any,
  initialScrollTop?: number,
  headerComponent?: Element,
  footerComponent?: Element
}

declare const GridList: React.SFC<GridListProps>;
export default GridList;
