var config = {
    "rootURL": "http://bltdev.wim.usgs.gov/BLTServices",
    "pulaURL": "http://bltdev.wim.usgs.gov/BLTServices/PULAs/FilteredSimplePULAs",
    "BLTMapServerURL": "http://bltdev.wim.usgs.gov/arcgis/rest/services/BLT/BLT_PULAsRelated/MapServer",
    "BLTMapServerPulaURl": "http://bltdev.wim.usgs.gov/arcgis/rest/services/BLT/BLT_PULAsRelated/MapServer/2/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&f=json",
    map: {
        arcGISMapServerURL: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
        center: {
            lat: 39.931486,
            lng: -101.406250,
            zoom: 3
        },
        topo: {
            name: "World Topographic",
            type: "agsDynamic",
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
            layerOptions: {
                opacity: 1,
                attribution: "Copyright:© 2015 Esri, DeLorme, FAO, NOAA, EPA",
                position: 'back'
            }
        },
        geosearch: {
            expanded: true,
            position: "topright",
            placeholder: "Find address or place",
            title: "Example search criteria: \n\t-City: New York, NY,\n\t-County: New York County, NY,\n\t-Landmark: Statue of Liberty, NY,\n\t-Zip code: zip code 10001,\n\t-Full address: Statue of Liberty National Monument, Liberty Island, New York, NY 10004\n\t-Latitude and longitude: type longitude first, then latitude in decimal degrees -74.0444, 40.6892"
        }
    }
}

config.justificationTypes = [{
        name: "Other",
        items: [{
            name: 'Other',
            value: "OTHER_JUSTIFICATION"
                }]
    }, {
        name: "Litigation",
        items: [{
            name: 'Biological Opinion',
            value: "BIOLOGICAL_OPINION_LIT"
                    }]
    }, {
        name: 'Registration Review',
        items: [
            {
                name: 'Focus Meeting',
                value: "FOCUS_MEETING"
                    },
            {
                name: 'Proposed Interim Decision',
                value: "INTERIM_PROPOSED_DECISION"
                    },
            {
                name: 'Proposed Decision',
                value: "PROPOSED_DECISION"
                    },
            {
                name: 'Interim Decision',
                value: "INTERIM_DECISION"
                    },
            {
                name: 'Final Decision',
                value: "FINAL_DECISION"
                    },
            {
                name: 'Biological Opinion',
                value: "BIOLOGICAL_OPINION_REGREVIEW"
            }]
    }, {
        name: 'Registration Action',
        items: [
            {
                name: 'Section 3 New Chem',
                value: "SEC3_NEWCHEM"
                    },
            {
                name: 'Section 3 New Use',
                value: "SEC3_NEWUSE"
                    },
            {
                name: 'Section 24 (c)',
                value: "SEC24"
                    },
            {
                name: 'Section 18 (c)',
                value: "SEC18"
            }]
    }
];

config.parts = {
    pageSize: 10,
    db: {
        "ACTIVE INGREDIENT": {
            heading: "ACTIVE INGREDIENT",
            url: "ActiveIngredients",
            includeCopy: true,
            primaryKey: "ID",
            copy: true,
            display: {
                columns: [{
                    name: "INGREDIENT_NAME",
                    heading: "Name"
            }],
                orderBy: "INGREDIENT_NAME"
            },
            edit: {
                columns: [{
                    name: "INGREDIENT_NAME",
                    label: "AI Name",
                    required: false
            }, {
                    name: "PC_CODE",
                    label: "PC Code",
                    required: true
            }, {
                    name: "CAS_NUMBER",
                    label: "CAS Number",
                    required: false
            }, {
                    name: "AI_CLASS",
                    label: "AI Class",
                    required: false,
                    sourceUrl: "/AIClasses",
                    value: ""
            }, {
                    name: "PRODUCT",
                    label: "Product",
                    required: false,
                    sourceUrl: "/Products"
            }]
            }
        },
        "AI CLASS": {
            heading: "AI CLASS",
            url: "AIClasses",
            includeCopy: false,
            primaryKey: "ID",
            display: {
                columns: [{
                    name: "AI_CLASS_NAME",
                    heading: "Name"
            }],
                orderBy: "AI_CLASS_NAME"
            },
            edit: {
                columns: [{
                    name: "AI_CLASS_NAME",
                    label: "AI Class Name",
                    required: true
            }]
            }
        },
        "APPLICATION METHOD": {
            heading: "APPLICATION METHOD",
            url: "ApplicationMethods",
            includeCopy: false,
            primaryKey: "ID",
            display: {
                columns: [{
                    name: "METHOD",
                    heading: "Method"
            }],
                orderBy: "METHOD"
            },
            edit: {
                columns: [{
                    name: "METHOD",
                    label: "Application Method",
                    required: true
            }]
            }
        },
        "CROP USE": {
            heading: "USE",
            url: "CropUses",
            includeCopy: false,
            primaryKey: "ID",
            display: {
                columns: [{
                    name: "USE",
                    heading: "Use"
            }],
                orderBy: "USE"
            },
            edit: {
                columns: [{
                    name: "USE",
                    label: "Use",
                    required: true
            }]
            }
        },
        //    {
        //        heading: "DIVISION",
        //        url: "/Divisions",
        //        includeCopy: false,
        //        columns: ["METHOD"],
        //        headings: ["Methos"],
        //        orderBy: "METHOD"
        //    }, 
        "EVENT": {
            heading: "EVENT",
            url: "Events",
            includeCopy: false,
            primaryKey: "EVENT_ID",
            display: {
                columns: [{
                    name: "NAME",
                    heading: "Name"
            }],
                orderBy: "NAME"
            },
            edit: {
                columns: [{
                    name: "NAME",
                    label: "Event",
                    required: true
            }]
            }
        },
        "FORMULATION": {
            heading: "FORMULATION",
            url: "Formulations",
            includeCopy: false,
            primaryKey: "ID",
            display: {
                columns: [{
                    name: "FORM",
                    heading: "Form"
            }],
                orderBy: "FORM"
            },
            edit: {
                columns: [{
                    name: "FORM",
                    label: "Formulation",
                    required: true
            }]
            }
        },
        "LIMITATION": {
            heading: "LIMITATION",
            url: "Limitations",
            includeCopy: false,
            primaryKey: "ID",
            copy: true,
            display: {
                columns: [{
                    name: "CODE",
                    heading: "Code"
            }, {
                    name: "LIMITATION1",
                    heading: "Limitation"
            }],
                orderBy: "CODE"
            },
            edit: {
                columns: [{
                    name: "CODE",
                    label: "Limitation Code",
                    required: false
            }, {
                    name: "LIMITATION1",
                    label: "Limitation",
                    required: true
            }]
            }
        },
        "ORGANIZATION": {
            heading: "ORGANIZATION",
            url: "Organizations",
            primaryKey: "ORGANIZATION_ID",
            includeCopy: false,
            enableDelete: false,
            display: {
                columns: [{
                    name: "NAME",
                    heading: "Name"
            }],
                orderBy: "NAME"
            },
            edit: {
                columns: [{
                    name: "NAME",
                    label: "Organization",
                    required: true
            }]
            }
        },
        "PRODUCT": {
            heading: "PRODUCT",
            url: "Products",
            includeCopy: false,
            search: true,
            primaryKey: "ID",
            display: {
                columns: [{
                    name: "PRODUCT_NAME",
                    heading: "Name"
            }],
                orderBy: "PRODUCT_NAME"
            },
            edit: {
                columns: [{
                    name: "PRODUCT_REGISTRATION_NUMBER",
                    label: "Registration Number",
                    required: true
            },{
                    name: "PRODUCT_NAME",
                    label: "Product Name",
                    required: true
            }]
            }
        }
    }
}

config.ADMIN_ROLE = "ADMIN"