var config = {
    "rootURL": "https://blt.wim.usgs.gov/BLTServices",
    "pulaURL": "https://blt.wim.usgs.gov/BLTServices/PULAs/FilteredSimplePULAs",
    "BLTMapServerURL": "https://blt.wim.usgs.gov/arcgis/rest/services/BLT/BLT_PULAsRelated/MapServer",
    "BLTMapServerPulaURl": "https://blt.wim.usgs.gov/arcgis/rest/services/BLT/BLT_PULAsRelated/MapServer/2/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&f=json",
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
            value: "other_justification"
                }]
    }, {
        name: "Litigation",
        items: [{
            name: 'Biological Opinion',
            value: "biological_opinion_lit"
                    }]
    }, {
        name: 'Registration Review',
        items: [
            {
                name: 'Focus Meeting',
                value: "focus_meeting"
                    },
            {
                name: 'Proposed Interim Decision',
                value: "interim_proposed_decision"
                    },
            {
                name: 'Proposed Decision',
                value: "proposed_decision"
                    },
            {
                name: 'Interim Decision',
                value: "interim_decision"
                    },
            {
                name: 'Final Decision',
                value: "final_decision"
                    },
            {
                name: 'Biological Opinion',
                value: "biological_opinion_regreview"
            }]
    }, {
        name: 'Registration Action',
        items: [
            {
                name: 'Section 3 New Chem',
                value: "sec3_newchem"
                    },
            {
                name: 'Section 3 New Use',
                value: "sec3_newuse"
                    },
            {
                name: 'Section 24 (c)',
                value: "sec24"
                    },
            {
                name: 'Section 18 (c)',
                value: "sec18"
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
            primaryKey: "id",
            copy: true,
            display: {
                columns: [{
                    name: "ingredient_name",
                    heading: "Name"
            }],
                orderBy: "ingredient_name"
            },
            edit: {
                columns: [{
                    name: "ingredient_name",
                    label: "AI Name",
                    required: false
            }, {
                    name: "pc_code",
                    label: "PC Code",
                    required: true
            }, {
                    name: "cas_number",
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
            primaryKey: "id",
            display: {
                columns: [{
                    name: "ai_class_name",
                    heading: "Name"
            }],
                orderBy: "ai_class_name"
            },
            edit: {
                columns: [{
                    name: "ai_class_name",
                    label: "AI Class Name",
                    required: true
            }]
            }
        },
        "APPLICATION METHOD": {
            heading: "APPLICATION METHOD",
            url: "ApplicationMethods",
            includeCopy: false,
            primaryKey: "id",
            display: {
                columns: [{
                    name: "method",
                    heading: "Method"
            }],
                orderBy: "method"
            },
            edit: {
                columns: [{
                    name: "method",
                    label: "Application Method",
                    required: true
            }]
            }
        },
        "CROP USE": {
            heading: "USE",
            url: "CropUses",
            includeCopy: false,
            primaryKey: "id",
            display: {
                columns: [{
                    name: "use",
                    heading: "Use"
            }],
                orderBy: "use"
            },
            edit: {
                columns: [{
                    name: "use",
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
            primaryKey: "event_id",
            display: {
                columns: [{
                    name: "name",
                    heading: "Name"
            }],
                orderBy: "name"
            },
            edit: {
                columns: [{
                    name: "name",
                    label: "Event",
                    required: true
            }]
            }
        },
        "FORMULATION": {
            heading: "FORMULATION",
            url: "Formulations",
            includeCopy: false,
            primaryKey: "id",
            display: {
                columns: [{
                    name: "form",
                    heading: "Form"
            }],
                orderBy: "form"
            },
            edit: {
                columns: [{
                    name: "form",
                    label: "Formulation",
                    required: true
            }]
            }
        },
        "LIMITATION": {
            heading: "LIMITATION",
            url: "Limitations",
            includeCopy: false,
            primaryKey: "id",
            copy: true,
            display: {
                columns: [{
                    name: "code",
                    heading: "Code"
            }, {
                    name: "limitation1",
                    heading: "Limitation"
            }],
                orderBy: "code"
            },
            edit: {
                columns: [{
                    name: "code",
                    label: "Limitation Code",
                    required: false
            }, {
                    name: "limitation1",
                    label: "Limitation",
                    required: true
            }]
            }
        },
        "ORGANIZATION": {
            heading: "ORGANIZATION",
            url: "Organizations",
            primaryKey: "organization_id",
            includeCopy: false,
            enableDelete: false,
            display: {
                columns: [{
                    name: "name",
                    heading: "Name"
            }],
                orderBy: "name"
            },
            edit: {
                columns: [{
                    name: "name",
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
            primaryKey: "id",
            display: {
                columns: [{
                    name: "product_name",
                    heading: "Name"
            }],
                orderBy: "product_name"
            },
            edit: {
                columns: [{
                    name: "product_registration_number",
                    label: "Registration Number",
                    required: true
            },{
                    name: "product_name",
                    label: "Product Name",
                    required: true
            }]
            }
        }
    }
}

config.ADMIN_ROLE = "ADMIN"