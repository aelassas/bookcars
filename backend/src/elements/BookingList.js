import React, { useState, useEffect } from 'react';
import { strings } from '../lang/booking-list';
import { DataGrid, frFR, enUS } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';

/**
 * Simulates server data loading
 */
const loadServerRows = (
    page,
    pageSize,
    allRows,
) =>
    new Promise((resolve) => {
        setTimeout(() => {
            resolve(allRows.slice(page * pageSize, (page + 1) * pageSize));
        }, Math.random() * 200 + 100); // simulate network latency
    });

const useQuery = (page, pageSize, allRows) => {
    const [rowCount, setRowCount] = useState(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);

    useEffect(() => {
        let active = true;

        setIsLoading(true);
        setRowCount(undefined);
        loadServerRows(page, pageSize, allRows).then((newRows) => {
            if (!active) {
                return;
            }
            setData(newRows);
            setIsLoading(false);
            setRowCount(allRows.length);
        });

        return () => {
            active = false;
        };
    }, [page, pageSize, allRows]);

    return { isLoading, data, rowCount };
};

/**
 * TODO: Improve `useDemoData` to move the fake pagination inside it instead of "fetching" everything of slicing in the component
 */
export default function ServerPaginationGrid(props) {
    const { data: demoData } = useDemoData({
        dataSet: 'Commodity',
        rowLength: 100,
        maxColumns: 6,
    });

    const [rowsState, setRowsState] = useState({
        page: 0,
        pageSize: 5,
    });

    const { isLoading, data, rowCount } = useQuery(
        rowsState.page,
        rowsState.pageSize,
        demoData.rows,
    );

    // Some api client return undefine while loading
    // Following lines are here to prevent `rowCountState` from being undefined during the loading
    const [rowCountState, setRowCountState] = useState(rowCount || 0);
    useEffect(() => {
        setRowCountState((prevRowCountState) =>
            rowCount !== undefined ? rowCount : prevRowCountState,
        );
    }, [rowCount, setRowCountState]);

    // const columns = [
    //     { field: 'firstName', headerName: 'First name', width: 130 },
    //     { field: 'lastName', headerName: 'Last name', width: 130 },
    // ];

    // company, car, driver, pickUpLocation, dropOffLocation, from, to, status, actions

    return (
        <div style={{ width: props.width || '100%', height: props.height || 400 }} className={props.className}>
            <DataGrid
                columns={demoData.columns}
                rows={data}
                rowCount={rowCountState}
                loading={isLoading}
                rowsPerPageOptions={[5, 10, 20]}
                pagination
                {...rowsState}
                paginationMode='server'
                onPageChange={(page) => setRowsState((prev) => ({ ...prev, page }))}
                onPageSizeChange={(pageSize) =>
                    setRowsState((prev) => ({ ...prev, pageSize }))
                }
                localeText={(props.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
                components={{
                    NoRowsOverlay: () => (
                        ''
                    )
                }}
            />
        </div>
    );
}
