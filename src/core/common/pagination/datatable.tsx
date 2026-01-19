/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";

type Viewport = "desktop" | "tablet" | "mobile";

const Datatable = ({ props, columns, dataSource, disableSelection, onRow, rowKey }: any) => {
  const [searchText, setSearchText] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [filteredDataSource, setFilteredDataSource] = useState(dataSource);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  useEffect(() => {
    setFilteredDataSource(dataSource);
  }, [dataSource]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setViewport("mobile");
      } else if (width < 1024) {
        setViewport("tablet");
      } else {
        setViewport("desktop");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const onSelectChange = (newSelectedRowKeys: any[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const handleSearch = (value: any) => {
    setSearchText(value);
    const q = String(value ?? "").toLowerCase();
    const source = Array.isArray(dataSource) ? dataSource : [];
    const filtered = source.filter((record: any) =>
      Object.values(record ?? {}).some((field) =>
        String(field).toLowerCase().includes(q)
      )
    );
    setFilteredDataSource(filtered);
  };

  const rowSelection = disableSelection
    ? undefined
    : {
        selectedRowKeys,
        onChange: onSelectChange,
      };

  const internalRowKey = useMemo(() => {
    if (typeof rowKey === "function") return rowKey;
    if (typeof rowKey === "string") {
      return (record: any) => (record ? record[rowKey] : undefined);
    }
    return (record: any, index: number) =>
      record && record.id != null ? record.id : index;
  }, [rowKey]);

  const resolvePriority = (col: any): "always" | "desktop" | "optional" => {
    if (!col) return "always";
    if (col.priority === "always" || col.priority === "desktop" || col.priority === "optional") {
      return col.priority;
    }
    return "always";
  };

  const isColumnVisible = (col: any): boolean => {
    const priority = resolvePriority(col);
    const mobileHidden = !!col.mobileHidden;

    if (viewport === "desktop") {
      return true;
    }

    if (viewport === "tablet") {
      return priority === "always";
    }

    // mobile
    if (priority !== "always") return false;
    if (mobileHidden) return false;
    return true;
  };

  const baseColumns = Array.isArray(columns) ? columns : [];

  const visibleColumns = useMemo(
    () => baseColumns.filter((col: any) => isColumnVisible(col)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, viewport]
  );

  const hiddenColumns = useMemo(
    () => baseColumns.filter((col: any) => !isColumnVisible(col)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, viewport]
  );

  const hasHiddenColumns = hiddenColumns.length > 0 && viewport !== "desktop";

  const renderHiddenDetails = (record: any) => {
    if (!hasHiddenColumns) return null;

    return (
      <div className="responsive-row-details">
        {hiddenColumns.map((col: any) => {
          if (!col) return null;
          const key = col.key || col.dataIndex || String(col.title);
          const rawValue =
            col.dataIndex != null && record
              ? (record as any)[col.dataIndex]
              : undefined;
          const valueNode =
            typeof col.render === "function"
              ? col.render(rawValue, record)
              : rawValue;

          return (
            <div className="responsive-row-detail-item" key={key}>
              <div className="responsive-row-detail-label">{col.title}</div>
              <div className="responsive-row-detail-value">{valueNode}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const expandable =
    hasHiddenColumns
      ? {
          expandedRowRender: renderHiddenDetails,
          expandRowByClick: false,
          expandIcon: ({ expanded, onExpand, record }: any) => (
            <button
              type="button"
              className="table-row-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                onExpand(record, e);
              }}
              aria-label={expanded ? "Collapse row details" : "Expand row details"}
              aria-expanded={expanded}
            >
              <i className={`ti ${expanded ? "ti-minus" : "ti-plus"}`} />
            </button>
          ),
        }
      : undefined;

  return (
    <>
      <div className="search-set table-search-set">
        <div className="search-input">
          <a href="#" className="btn btn-searchset">
            <i className="ti ti-search fs-14 feather-search" />
          </a>
          <div id="DataTables_Table_0_filter" className="dataTables_filter">
            <label>
              {" "}
              <input
                type="search"
                onChange={(e) => handleSearch(e.target.value)}
                className="form-control form-control-sm"
                placeholder="Search"
                aria-controls="DataTables_Table_0"
                value={searchText}
              />
            </label>
          </div>
        </div>
      </div>

      <Table
        key={props}
        className="table datanew dataTable no-footer"
        rowSelection={rowSelection}
        columns={visibleColumns}
        dataSource={filteredDataSource}
        rowKey={internalRowKey}
        onRow={onRow}
        expandable={expandable}
        pagination={{
          locale: { items_per_page: "" },
          nextIcon: (
            <span>
              <i className="fa fa-angle-right" />
            </span>
          ),
          prevIcon: (
            <span>
              <i className="fa fa-angle-left" />
            </span>
          ),
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "30"],
        }}
      />
    </>
  );
};

export default Datatable;
