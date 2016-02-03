//------------------------------------------------------------------------------
//----- PartsController.cs-----------------------------------------------------
//------------------------------------------------------------------------------

//-------1---------2---------3---------4---------5---------6---------7---------8
//       01234567890123456789012345678901234567890123456789012345678901234567890
//-------+---------+---------+---------+---------+---------+---------+---------+

// copyright:   2012 WiM - USGS

//    authors:  Tonia Roddick USGS Wisconsin Internet Mapping
//              
//  
//   purpose:   Display a master PULA page and link to individual parts pages (all in popup)
//
//discussion:   
//
//     

#
region Comments
// 05.01.14 - TR - added new fields to AI_PULA
// 05.03.13 - TR - Created

# endregion

using System;
using System.Collections;
using System.Collections.Generic;
using System.Data.Objects.DataClasses;
using System.Text;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;
using System.Text.RegularExpressions;

using RestSharp;
using BLTServices;
using BLTServices.Authentication;
using BLTServices.Resources;
using BLTWeb.Utilities;
using BLTWeb.Models;
using BLTWeb.Helpers;

namespace BLTWeb.Controllers {
    [RequireSSL]
    [Authorize]
    public class PULAController: Controller {
        //pula was clicked in map
        public ActionResult PULA_Click(string shapeId, DateTime ? date, int ? eventId) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();

            date = date == null ? DateTime.Now : date;
            int sID = Convert.ToInt32(shapeId);

            //what do they want to see? 
            //1: Create an empty PULA (shapeID doesn't exist yet in db) ---what if it does, but it's expired and they want to create a new one from same shape
            //2: Publish a saved PULA or make changes to created pula (shapeId exists, but not published)
            //3: Look at details of a published PULA

            request.Resource = "/PULAs/POI/{shapeId}?publishedDate={date}";
            request.RootElement = "ACTIVE_INGREDIENT_PULA";
            request.AddParameter("shapeId", sID, ParameterType.UrlSegment);
            ACTIVE_INGREDIENT_PULA thisPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

            //if PULA exists 
            //if contributor logged in
            //Contributor_Details
            //else
            //PULA_Details
            // else = PULA_Create

            if (thisPULA != null) //shapeID exists
            {
                //if contributor is logged in, give him the contributor_details page
                if (eventId != null) {
                    return RedirectToAction("Contributor_Details", new {
                        shapeId = sID
                    });
                } else {
                    //pula has not been published, but does exist , send to PULA_Publish
                    return RedirectToAction("PULA_Details", new {
                        shapeId = shapeId, date = date
                    });
                }
            } else {
                //pula hasn't been created yet, send to PULA_Create --- or pula was expired and this is a new one
                return RedirectToAction("PULA_Create", new {
                    shapeId = shapeId
                });
            }
        }

        //determined that shapeId doesn't exist yet in db, here's create popup
        public PartialViewResult PULA_Create(int shapeId) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();

            //get the Events
            request.Resource = "Events/";
            request.RootElement = "ArrayOfEVENT";
            ViewData["EventList"] = serviceCaller.Execute < List < EVENT >> (request);

            //store the logged in user
            USER_ loggedIn = GetLoggedInUser();
            ViewData["User"] = loggedIn;
            ViewData["shapeId"] = shapeId; //store shape id to pass on

            //get organization and division (if one)            
            if (loggedIn.ORGANIZATION_ID != 0 && loggedIn.ORGANIZATION_ID != null) {
                request = new RestRequest();
                request.Resource = "Organizations/{organizationID}";
                request.RootElement = "ORGANIZATION";
                request.AddParameter("organizationID", loggedIn.ORGANIZATION_ID, ParameterType.UrlSegment);
                ViewData["Organization"] = serviceCaller.Execute < ORGANIZATION > (request).NAME;
            }
            if (loggedIn.DIVISION_ID != 0 && loggedIn.DIVISION_ID != null) {
                request = new RestRequest();
                request.Resource = "Divisions/{divisionID}";
                request.RootElement = "DIVISION";
                request.AddParameter("divisionID", loggedIn.DIVISION_ID, ParameterType.UrlSegment);
                ViewData["Division"] = serviceCaller.Execute < DIVISION > (request).DIVISION_NAME;
            } else {
                request = new RestRequest();
                request.Resource = "Divisions";
                request.RootElement = "ArrayOfDIVISION";
                List < DIVISION > divList = serviceCaller.Execute < List < DIVISION >> (request);
                ViewData["DivisionList"] = divList;
            }

            //get lists for AI, Modifiers, Crop Use, Code, AI CLass and CAS NOT WORKING RIGHT NOW 6.27.13
            request = new RestRequest();
            request.Resource = "/ActiveIngredients?publishedDate={date}";
            request.RootElement = "ArrayOfACTIVE_INGREDIENT";
            List < ACTIVE_INGREDIENT > aiList = serviceCaller.Execute < List < ACTIVE_INGREDIENT >> (request);
            ViewData["AIList"] = aiList;

            request = new RestRequest();
            request.Resource = "/CropUses?publishedDate={date}";
            request.RootElement = "ArrayOfCROP_USE";
            List < CROP_USE > CUList = serviceCaller.Execute < List < CROP_USE >> (request);
            ViewData["CUList"] = CUList;

            request = new RestRequest();
            request.Resource = "/ApplicationMethods?publishedDate={date}";
            request.RootElement = "ArrayOfAPPLICATION_METHOD";
            List < APPLICATION_METHOD > appMethodsList = serviceCaller.Execute < List < APPLICATION_METHOD >> (request);
            ViewData["AppMethodsList"] = appMethodsList;

            request = new RestRequest();
            request.Resource = "/Formulations?publishedDate={date}";
            request.RootElement = "ArrayOfFORMULATION";
            List < FORMULATION > formulationsList = serviceCaller.Execute < List < FORMULATION >> (request);
            ViewData["FormulationsList"] = formulationsList;

            request = new RestRequest();
            request.Resource = "/Limitations?publishedDate={date}";
            request.RootElement = "ArrayOfLIMITATION";
            List < LIMITATION > CodeList = serviceCaller.Execute < List < LIMITATION >> (request);
            ViewData["CodeList"] = CodeList;

            //get species
            request = new RestRequest();
            request.Resource = "/SimpleSpecies";
            request.RootElement = "ArrayOfSpecies";
            SpeciesList SppList = serviceCaller.Execute < SpeciesList > (request);

            ViewData["SpeciesListCom"] = SppList.SPECIES.OrderBy(X => X.COMNAME).ToList();
            ViewData["SpeciesListScie"] = SppList.SPECIES.OrderBy(x => x.SCINAME).ToList();
            ViewData["SpeciesEntityIDs"] = SppList.SPECIES.OrderBy(x => x.ENTITY_ID).ToList();
            if (SppList.SPECIES.Count == 0) {
                ViewData["TESSError"] = true;
            }


            //get months and years lists (1 each for Effective Data and Expiration Date)
            ViewData["EffMonths"] = GetMonthsList();
            ViewData["EffYears"] = GetEffectYears();
            ViewData["ExMonths"] = GetMonthsList();
            ViewData["ExYears"] = GetYearList();

            return PartialView();
        }

        //post to create (populate) the pula
        [HttpPost]
        public ActionResult PULACreate(PULA_Model thisPULA) {
            try {
                BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
                var request = new RestRequest(Method.POST);

                //post the ACTIVE_INGREDIENT_PULA
                ACTIVE_INGREDIENT_PULA anAIPULA = thisPULA.anAIPULA;

                //format created date

                //format effective Date
                if (!string.IsNullOrWhiteSpace(thisPULA.EffMonths)) {
                    string effectiveMonth = thisPULA.EffMonths;
                    string effectiveYear = thisPULA.EffYears;
                    string effectiveDate = effectiveMonth + "/01/" + effectiveYear;
                    anAIPULA.EFFECTIVE_DATE = DateTime.Parse(effectiveDate);
                }

                request.Resource = "/PULAs";
                request.RequestFormat = DataFormat.Xml;
                request.AddHeader("Content-Type", "application/xml");
                //Use extended serializer
                BLTWebSerializer serializer = new BLTWebSerializer();
                request.AddParameter("application/xml", serializer.Serialize < ACTIVE_INGREDIENT_PULA > (anAIPULA), ParameterType.RequestBody);
                ACTIVE_INGREDIENT_PULA createdPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

                //if expiration date is set, ExpirePULA
                if (!string.IsNullOrWhiteSpace(thisPULA.ExMonths)) {
                    string ExpireMonth = thisPULA.ExMonths;
                    string ExpireYear = thisPULA.ExYears;
                    string expirationDate = ExpireMonth + "/01/" + ExpireYear;
                    request = new RestRequest();
                    request.Resource = "/PULAs/{entityID}/updateStatus?status={status}&statusDate={date}";
                    request.RootElement = "ACTIVE_INGREDIENT_PULA";
                    request.AddParameter("entityID", createdPULA.ID, ParameterType.UrlSegment);
                    request.AddParameter("status", "EXPIRED", ParameterType.UrlSegment);
                    request.AddParameter("date", expirationDate, ParameterType.UrlSegment);
                    serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);
                }

                //add SPECIES_ACTIVE_INGREDIENT_PULA
                SpeciesList theSPpList = new SpeciesList();
                if (!string.IsNullOrWhiteSpace(thisPULA.SpeciesToAdd)) {
                    List < Int32 > speciesIDs = new List < int > ();
                    //parse
                    string[] spp = Regex.Split(thisPULA.SpeciesToAdd, ",");
                    //put them into a list of ints to add to the simpleSpecies
                    foreach(string sp in spp) {
                            if (!string.IsNullOrEmpty(sp)) {
                                speciesIDs.Add(Convert.ToInt32(sp));
                            }
                        }
                        //create a SimpleSpecies with each id (s)
                    theSPpList.SPECIES = speciesIDs.Select(s => new SimpleSpecies {
                        ENTITY_ID = s
                    }).ToList < SimpleSpecies > ();

                    //now post the list
                    request = new RestRequest(Method.POST);
                    request.Resource = "PULAs/{entityID}/AddSpeciesToPULA?publishedDate={date}";
                    request.AddParameter("entityID", createdPULA.PULA_ID, ParameterType.UrlSegment);
                    request.AddHeader("Content-Type", "application/xml");
                    //Use extended serializer
                    serializer = new BLTWebSerializer();
                    request.AddParameter("application/xml", serializer.Serialize < SpeciesList > (theSPpList), ParameterType.RequestBody);
                    SpeciesList createdAIsppList = serviceCaller.Execute < SpeciesList > (request);
                }

                //post each PULA_LIMITATIONS
                List < PULA_LIMITATIONS > pulaLimitations = new List < PULA_LIMITATIONS > ();

                if (!string.IsNullOrWhiteSpace(thisPULA.LimitationsToAdd)) {
                    // parse it out by the [ ]
                    string[] eachLim = Regex.Split(thisPULA.LimitationsToAdd, "]");

                    // find out if its an A or P (AI or Product) at the start
                    foreach(string e in eachLim) {
                        PULA_LIMITATIONS thisLimit = new PULA_LIMITATIONS();
                        if (e.Contains("A")) {
                            //it's an AI limitation (aiID,useID,amID,formID,codeID )
                            //parse it again on the "," 
                            string[] aiLimit = Regex.Split(e, ",");

                            //make sure there are no empty ones
                            aiLimit = aiLimit.Where(x => !string.IsNullOrEmpty(x)).ToArray();

                            //populate the PULA_LIMITATION
                            if (aiLimit[0] != "0") {
                                thisLimit.PULA_ID = createdPULA.PULA_ID;
                                thisLimit.ACTIVE_INGREDIENT_ID = Convert.ToDecimal(aiLimit[0].Substring(2));
                                thisLimit.CROP_USE_ID = Convert.ToDecimal(aiLimit[1]);
                                thisLimit.APPLICATION_METHOD_ID = Convert.ToDecimal(aiLimit[2]);
                                thisLimit.FORMULATION_ID = Convert.ToDecimal(aiLimit[3]);
                                thisLimit.LIMITATION_ID = Convert.ToDecimal(aiLimit[4]);
                            }
                        } else if (e.Contains("P")) {
                            //it's a Product Limitation (prodID,useID,amID,formID,codeID )
                            string[] prLimit = Regex.Split(e, ",");

                            //make sure there are no empty ones
                            prLimit = prLimit.Where(x => !string.IsNullOrEmpty(x)).ToArray();

                            //populate the PULA_LIMITATION
                            if (prLimit[0] != "0") {
                                thisLimit.PULA_ID = createdPULA.PULA_ID;
                                thisLimit.PRODUCT_ID = Convert.ToDecimal(prLimit[0].Substring(2));
                                thisLimit.CROP_USE_ID = Convert.ToDecimal(prLimit[1]);
                                thisLimit.APPLICATION_METHOD_ID = Convert.ToDecimal(prLimit[2]);
                                thisLimit.FORMULATION_ID = Convert.ToDecimal(prLimit[3]);
                                thisLimit.LIMITATION_ID = Convert.ToDecimal(prLimit[4]);
                            }
                        }
                        //add it to the list of PULALimitations to POST (make sure there's a populated pulaLimitation first
                        if (thisLimit.FORMULATION_ID > 0) {
                            pulaLimitations.Add(thisLimit);
                        }
                    }
                }

                //now that i have the pula-limitations, post them
                foreach(PULA_LIMITATIONS pl in pulaLimitations) {
                    //post it
                    request = new RestRequest(Method.POST);
                    request.Resource = "PULALimitations";
                    request.AddHeader("Content-Type", "application/xml");
                    serializer = new BLTWebSerializer();
                    request.AddParameter("application/xml", serializer.Serialize < PULA_LIMITATIONS > (pl), ParameterType.RequestBody);
                    PULA_LIMITATIONS createdPULALimit = serviceCaller.Execute < PULA_LIMITATIONS > (request);
                }
                ViewData["UpdatePULA"] = "Created";
                return RedirectToAction("PULA_Details", new {
                    shapeId = createdPULA.PULA_SHAPE_ID, date = DateTime.Now, status = "update"
                });
            } catch {
                return RedirectToAction("ErrorPage");
            }
        }

        //pula was clicked in mapper, show info in popup
        // GET: /PULA_Details/11
        public PartialViewResult PULA_Details(int shapeId, DateTime date, string status) {
            if (status != null)
                ViewData["UpdatePULA"] = "updated";

            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();

            //get the ACTIVE_INGREDIENT_PULA
            request.Resource = "/PULAs/POI/{shapeId}?publishedDate={date}";
            request.RootElement = "ACTIVE_INGREDIENT_PULA";
            request.AddParameter("shapeId", shapeId, ParameterType.UrlSegment);
            ACTIVE_INGREDIENT_PULA thisPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

            if (thisPULA.EFFECTIVE_DATE != null) {
                string monthYear = GetThisMonth(thisPULA.EFFECTIVE_DATE.Value.Month) + thisPULA.EFFECTIVE_DATE.Value.Year;
                ViewData["EffectMonthYr"] = monthYear;
            }

            //pull out the comments '[Name|Org|omment][Name2|Org2|comment2]
            if (thisPULA.COMMENTS != null) {
                string[] comments = thisPULA.COMMENTS.Split(new char[] {
                    '[', ']'
                }, StringSplitOptions.RemoveEmptyEntries); //Regex.Split(thisPULA.COMMENTS, "]");
                List < CommentsModel > allComments = new List < CommentsModel > ();
                foreach(string c in comments) {
                    CommentsModel aComment = new CommentsModel();
                    string[] aCom = c.Split('|');
                    foreach(string ac in aCom) {
                        aComment.Name = aCom[0];
                        aComment.Org = aCom[1];
                        aComment.Comment = aCom[2];
                    }
                    allComments.Add(aComment);
                }
                ViewData["Comments"] = allComments;
            }

            //get the Events
            request.Resource = "Events/{eventID}";
            request.RootElement = "EVENT";
            request.AddParameter("eventID", thisPULA.EVENT_ID, ParameterType.UrlSegment);
            EVENT anEvent = serviceCaller.Execute < EVENT > (request);
            ViewData["EventName"] = anEvent != null ? anEvent.NAME : "";

            //get the version info
            request = new RestRequest();
            request.Resource = "/Version/{entityID}";
            request.RootElement = "VERSION";
            request.AddParameter("entityID", thisPULA.VERSION_ID, ParameterType.UrlSegment);
            VERSION thisVersion = serviceCaller.Execute < VERSION > (request);
            ViewData["Version"] = thisVersion; //store to get created and expired dates

            //get the Users from Version
            //creator
            request = new RestRequest();
            request.Resource = "/Users/{userID}";
            request.RootElement = "ArrayOfUSER_";
            request.AddParameter("userID", thisVersion.CREATOR_ID, ParameterType.UrlSegment);
            List < USER_ > creatList = serviceCaller.Execute < List < USER_ >> (request);
            USER_ creator = creatList.FirstOrDefault();

            if (creator != null) {
                ViewData["CreatorName"] = creator.FNAME + " " + creator.LNAME;

                if (creator.ORGANIZATION_ID != 0 && creator.ORGANIZATION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Organizations/{organizationID}";
                    request.RootElement = "ORGANIZATION";
                    request.AddParameter("organizationID", creator.ORGANIZATION_ID, ParameterType.UrlSegment);
                    ViewData["creatorOrg"] = serviceCaller.Execute < ORGANIZATION > (request).NAME;
                }
                if (creator.DIVISION_ID != 0 && creator.DIVISION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Divisions/{divisionID}";
                    request.RootElement = "DIVISION";
                    request.AddParameter("divisionID", creator.DIVISION_ID, ParameterType.UrlSegment);
                    ViewData["creatorDiv"] = serviceCaller.Execute < DIVISION > (request).DIVISION_NAME;
                }
            }
            //Publisher
            if (thisVersion.PUBLISHER_ID != null && thisVersion.PUBLISHER_ID != 0) {
                request = new RestRequest();
                request.Resource = "/Users/{userID}";
                request.RootElement = "ArrayOfUSER_";
                request.AddParameter("userID", thisVersion.PUBLISHER_ID, ParameterType.UrlSegment);
                List < USER_ > pubList = serviceCaller.Execute < List < USER_ >> (request);
                USER_ publisher = pubList.FirstOrDefault();

                if (publisher.ORGANIZATION_ID != 0 && publisher.ORGANIZATION_ID != null) {
                    ViewData["publisherName"] = publisher.FNAME + " " + publisher.LNAME;

                    request = new RestRequest();
                    request.Resource = "/Organizations/{organizationID}";
                    request.RootElement = "ORGANIZATION";
                    request.AddParameter("organizationID", publisher.ORGANIZATION_ID, ParameterType.UrlSegment);
                    ViewData["publisherOrg"] = serviceCaller.Execute < ORGANIZATION > (request).NAME;
                }
                if (publisher.DIVISION_ID != 0 && publisher.DIVISION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Divisions/{divisionID}";
                    request.RootElement = "DIVISION";
                    request.AddParameter("divisionID", publisher.DIVISION_ID, ParameterType.UrlSegment);
                    ViewData["publisherDiv"] = serviceCaller.Execute < DIVISION > (request).DIVISION_NAME;
                }
            }

            //Expirer
            if (thisVersion.EXPIRER_ID != null && thisVersion.EXPIRER_ID != 0) {
                request = new RestRequest();
                request.Resource = "/Users/{userID}";
                request.RootElement = "ArrayOfUSER_";
                request.AddParameter("userID", thisVersion.EXPIRER_ID, ParameterType.UrlSegment);
                List < USER_ > expList = serviceCaller.Execute < List < USER_ >> (request);
                USER_ expirer = expList.FirstOrDefault();

                if (expirer.ORGANIZATION_ID != 0 && expirer.ORGANIZATION_ID != null) {
                    ViewData["expirerName"] = expirer.FNAME + " " + expirer.LNAME;

                    request = new RestRequest();
                    request.Resource = "/Organizations/{organizationID}";
                    request.RootElement = "ORGANIZATION";
                    request.AddParameter("organizationID", expirer.ORGANIZATION_ID, ParameterType.UrlSegment);
                    ViewData["expirerOrg"] = serviceCaller.Execute < ORGANIZATION > (request).NAME;
                }
                if (expirer.DIVISION_ID != 0 && expirer.DIVISION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Divisions/{divisionID}";
                    request.RootElement = "DIVISION";
                    request.AddParameter("divisionID", expirer.DIVISION_ID, ParameterType.UrlSegment);
                    ViewData["expirerDiv"] = serviceCaller.Execute < DIVISION > (request).DIVISION_NAME;
                }
            }

            //get the PULA species
            request = new RestRequest();
            request.Resource = "/ActiveIngredientPULA/{activeIngredientPULAID}/Species";
            request.RootElement = "ArrayOfSPECIES_ACTIVE_INGREDIENT_PULA";
            request.AddParameter("activeIngredientPULAID", thisPULA.PULA_ID, ParameterType.UrlSegment);
            SpeciesList PULAspp = serviceCaller.Execute < SpeciesList > (request);
            if (PULAspp != null) {
                ViewData["PULASpp"] = PULAspp.SPECIES.OrderBy(x => x.COMNAME).ToList();
            } else {
                ViewData["TESSError"] = true;
            }
            //get the PULA_LIMITATIONs
            request = new RestRequest();
            request.Resource = "PULAs/{pulaID}/PULALimitations?ActiveDate={date}";
            request.RootElement = "ArrayOfPULA_LIMITATIONS";
            request.AddParameter("pulaID", thisPULA.PULA_ID, ParameterType.UrlSegment);
            List < PULA_LIMITATIONS > PULALimitationList = serviceCaller.Execute < List < PULA_LIMITATIONS >> (request);

            //to display each row in the table, use model
            List < PULALimitation > PubPulaLists = new List < PULALimitation > ();

            //get all the Limitation parts
            foreach(PULA_LIMITATIONS pl in PULALimitationList) {
                PULALimitation thisPubPULA = new PULALimitation();
                if (pl.ACTIVE_INGREDIENT_ID != null && pl.ACTIVE_INGREDIENT_ID != 0) {
                    //get Active Ingredient
                    request = new RestRequest();
                    request.Resource = "/ActiveIngredients?aiID={activeIngredientID}&publishedDate={date}";
                    request.RootElement = "ArrayOfACTIVE_INGREDIENT";
                    request.AddParameter("activeIngredientID", pl.ACTIVE_INGREDIENT_ID, ParameterType.UrlSegment);
                    List < ACTIVE_INGREDIENT > aiList = serviceCaller.Execute < List < ACTIVE_INGREDIENT >> (request);
                    //give me newest version
                    ACTIVE_INGREDIENT thisAI = aiList.OrderByDescending(a => a.VERSION_ID).FirstOrDefault();
                    //store in model
                    thisPubPULA.AI = thisAI.INGREDIENT_NAME;
                }
                if (pl.PRODUCT_ID != null && pl.PRODUCT_ID != 0) {
                    //get Active Ingredient
                    request = new RestRequest();
                    request.Resource = "/Products?ProductID={productID}&publishedDate={date}";
                    request.RootElement = "ArrayOfPRODUCT";
                    request.AddParameter("productID", pl.PRODUCT_ID, ParameterType.UrlSegment);
                    List < PRODUCT > prodList = serviceCaller.Execute < List < PRODUCT >> (request);
                    //give me newest version
                    PRODUCT thisprod = prodList.OrderByDescending(a => a.VERSION_ID).FirstOrDefault();
                    //store in model
                    thisPubPULA.Product = thisprod.PRODUCT_NAME;
                    thisPubPULA.Prod_RegNum = thisprod.PRODUCT_REGISTRATION_NUMBER;
                }

                //get crop use
                request = new RestRequest();
                request.Resource = "/CropUses?CropUseID={cropUseID}&publishedDate={date}";
                request.RootElement = "ArrayOfCROP_USE";
                request.AddParameter("cropUseID", pl.CROP_USE_ID, ParameterType.UrlSegment);
                List < CROP_USE > cuList = serviceCaller.Execute < List < CROP_USE >> (request);
                //give me the newest version
                CROP_USE thisCropUse = cuList.OrderByDescending(cu => cu.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.CropUse = thisCropUse.USE;

                //get application Method and store in model
                thisPubPULA.AppMethod = GetApplicationMethod(pl.APPLICATION_METHOD_ID).METHOD;

                //get formulation
                request = new RestRequest();
                request.Resource = "/Formulations?FormulationID={formulationID}&publishedDate={date}";
                request.RootElement = "ArrayOfFORMULATION";
                request.AddParameter("formulationID", pl.FORMULATION_ID, ParameterType.UrlSegment);
                List < FORMULATION > formList = serviceCaller.Execute < List < FORMULATION >> (request);
                //give me the newest version
                FORMULATION thisFormulation = formList.OrderByDescending(m => m.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.Formulation = thisFormulation.FORM;

                //get limitation code
                request = new RestRequest();
                // request.Resource = "/Limitations?limitationID={limitationID}&publishedDate={date}";
                request.Resource = "/Limitations/{limitationID}?publishedDate={date}";
                request.RootElement = "ArrayOfLIMITATION";
                request.AddParameter("limitationID", pl.LIMITATION_ID, ParameterType.UrlSegment);
                List < LIMITATION > lList = serviceCaller.Execute < List < LIMITATION >> (request);
                //give me the newest version
                LIMITATION thislimitation = lList.OrderByDescending(l => l.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.Code = thislimitation.CODE;
                thisPubPULA.Limitation = thislimitation.LIMITATION1;

                PubPulaLists.Add(thisPubPULA);
            }

            ViewData["PULAlimitationList"] = PubPulaLists;

            //get months and years lists
            ViewBag.Months = GetMonthsList();
            ViewBag.Years = GetYearList();

            //get logged in User
            ViewData["loggedIn"] = GetLoggedInUser();

            return PartialView(thisPULA);
        }

        //PULA was determined to be Created but not Published, can be edited
        // GET: /PULA_Publish/11 (edit page -- can be published or updated/saved)
        public PartialViewResult PULA_Edit(int shapeId, DateTime ? date) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();

            //get the ACTIVE_INGREDIENT_PULA
            request.Resource = "/PULAs/POI/{shapeId}?publishedDate={date}";
            request.RootElement = "ACTIVE_INGREDIENT_PULA";
            request.AddParameter("shapeId", shapeId, ParameterType.UrlSegment);
            ACTIVE_INGREDIENT_PULA thisPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

            //store the logged in user
            USER_ loggedIn = GetLoggedInUser();
            ViewData["User"] = loggedIn;
            ViewData["shapeId"] = shapeId; //store shape id to pass on

            //get the version info
            request = new RestRequest();
            request.Resource = "/Version/{entityID}";
            request.RootElement = "VERSION";
            request.AddParameter("entityID", thisPULA.VERSION_ID, ParameterType.UrlSegment);
            VERSION thisVersion = serviceCaller.Execute < VERSION > (request);
            ViewData["Version"] = thisVersion; //store to get created and expired dates

            //get the Users from Version
            //creator
            request = new RestRequest();
            request.Resource = "/Users/{userID}";
            request.RootElement = "ArrayOfUSER_";
            request.AddParameter("userID", thisVersion.CREATOR_ID, ParameterType.UrlSegment);
            List < USER_ > creatList = serviceCaller.Execute < List < USER_ >> (request);
            USER_ creator = creatList.FirstOrDefault();

            if (creator != null) {
                ViewData["CreatorName"] = creator.FNAME + " " + creator.LNAME;

                if (creator.ORGANIZATION_ID != 0 && creator.ORGANIZATION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Organizations/{organizationID}";
                    request.RootElement = "ORGANIZATION";
                    request.AddParameter("organizationID", creator.ORGANIZATION_ID, ParameterType.UrlSegment);
                    ViewData["creatorOrg"] = serviceCaller.Execute < ORGANIZATION > (request).NAME;
                }
                if (creator.DIVISION_ID != 0 && creator.DIVISION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Divisions/{divisionID}";
                    request.RootElement = "DIVISION";
                    request.AddParameter("divisionID", creator.DIVISION_ID, ParameterType.UrlSegment);
                    ViewData["creatorDiv"] = serviceCaller.Execute < DIVISION > (request).DIVISION_NAME;
                }
            }

            //Expirer
            if (thisVersion.EXPIRER_ID != null && thisVersion.EXPIRER_ID != 0) {
                request = new RestRequest();
                request.Resource = "/Users/{userID}";
                request.RootElement = "ArrayOfUSER_";
                request.AddParameter("userID", thisVersion.EXPIRER_ID, ParameterType.UrlSegment);
                List < USER_ > expList = serviceCaller.Execute < List < USER_ >> (request);
                USER_ expirer = expList.FirstOrDefault();

                if (expirer.ORGANIZATION_ID != 0 && expirer.ORGANIZATION_ID != null) {
                    ViewData["expirerName"] = expirer.FNAME + " " + expirer.LNAME;

                    request = new RestRequest();
                    request.Resource = "/Organizations/{organizationID}";
                    request.RootElement = "ORGANIZATION";
                    request.AddParameter("organizationID", expirer.ORGANIZATION_ID, ParameterType.UrlSegment);
                    ViewData["expirerOrg"] = serviceCaller.Execute < ORGANIZATION > (request).NAME;
                }
                if (expirer.DIVISION_ID != 0 && expirer.DIVISION_ID != null) {
                    request = new RestRequest();
                    request.Resource = "/Divisions/{divisionID}";
                    request.RootElement = "DIVISION";
                    request.AddParameter("divisionID", expirer.DIVISION_ID, ParameterType.UrlSegment);
                    ViewData["expirerDiv"] = serviceCaller.Execute < DIVISION > (request).DIVISION_NAME;
                }
            }

            //get the PULA species
            request = new RestRequest();
            request.Resource = "/ActiveIngredientPULA/{activeIngredientPULAID}/Species";
            request.RootElement = "ArrayOfSPECIES";
            request.AddParameter("activeIngredientPULAID", thisPULA.PULA_ID, ParameterType.UrlSegment);
            SpeciesList PULAspp = serviceCaller.Execute < SpeciesList > (request);
            if (PULAspp != null) {
                ViewData["PULASpp"] = PULAspp.SPECIES.OrderBy(x => x.COMNAME).ToList();
            } else {
                ViewData["TESSError"] = true;
            }
            //get lists for AI, Modifiers, Crop Use, Code, AI CLass and CAS NOT WORKING RIGHT NOW 6.27.13
            request = new RestRequest();
            request.Resource = "ActiveIngredients?status={status}&date={date}";
            request.RootElement = "ArrayOfACTIVE_INGREDIENT";
            request.AddParameter("status", "published", ParameterType.UrlSegment);
            List < ACTIVE_INGREDIENT > AllAIs = serviceCaller.Execute < List < ACTIVE_INGREDIENT >> (request);
            ViewData["AIList"] = AllAIs;

            request = new RestRequest();
            request.Resource = "CropUses?status={status}&date={date}";
            request.RootElement = "ArrayOfCROP_USE";
            request.AddParameter("status", "published", ParameterType.UrlSegment);
            List < CROP_USE > CUList = serviceCaller.Execute < List < CROP_USE >> (request);
            ViewData["CUList"] = CUList.OrderBy(x => x.USE).ToList();

            request = new RestRequest();
            request.Resource = "ApplicationMethods?status={status}&date={date}";
            request.RootElement = "ArrayOfAPPLICATION_METHOD";
            request.AddParameter("status", "published", ParameterType.UrlSegment);
            List < APPLICATION_METHOD > appMethodsList = serviceCaller.Execute < List < APPLICATION_METHOD >> (request);
            ViewData["AppMethodsList"] = appMethodsList.OrderBy(x => x.METHOD).ToList();

            request = new RestRequest();
            request.Resource = "Formulations?status={status}&date={date}";
            request.RootElement = "ArrayOfFORMULATION";
            request.AddParameter("status", "published", ParameterType.UrlSegment);
            List < FORMULATION > formulationsList = serviceCaller.Execute < List < FORMULATION >> (request);
            ViewData["FormulationsList"] = formulationsList.OrderBy(x => x.FORM).ToList();

            request = new RestRequest();
            request.Resource = "Limitations?status={status}&date={date}";
            request.RootElement = "ArrayOfLIMITATION";
            request.AddParameter("status", "published", ParameterType.UrlSegment);
            List < LIMITATION > CodeList = serviceCaller.Execute < List < LIMITATION >> (request);
            ViewData["CodeList"] = CodeList.OrderBy(x => x.CODE).ToList();


            //get the PULA_LIMITATIONs
            request = new RestRequest();
            request.Resource = "PULAs/{pulaID}/PULALimitations?ActiveDate={date}";
            request.RootElement = "ArrayOfPULA_LIMITATIONS";
            request.AddParameter("pulaID", thisPULA.PULA_ID, ParameterType.UrlSegment);
            List < PULA_LIMITATIONS > PULALimitationList = serviceCaller.Execute < List < PULA_LIMITATIONS >> (request);

            //to store each row in the table for display
            List < PULALimitation > PubPulaLists = new List < PULALimitation > ();
            //get all the Limitation parts
            foreach(PULA_LIMITATIONS pl in PULALimitationList) {
                PULALimitation thisPubPULA = new PULALimitation();
                thisPubPULA.PulaLimitID = pl.PULA_LIMITATION_ID.ToString();
                if (pl.ACTIVE_INGREDIENT_ID != null && pl.ACTIVE_INGREDIENT_ID != 0) {
                    //get Active Ingredient
                    request = new RestRequest();
                    request.Resource = "/ActiveIngredients?aiID={activeIngredientID}&publishedDate={date}";
                    request.RootElement = "ArrayOfACTIVE_INGREDIENT";
                    request.AddParameter("activeIngredientID", pl.ACTIVE_INGREDIENT_ID, ParameterType.UrlSegment);
                    List < ACTIVE_INGREDIENT > aiList = serviceCaller.Execute < List < ACTIVE_INGREDIENT >> (request);
                    //give me newest version
                    ACTIVE_INGREDIENT thisAI = aiList.OrderByDescending(a => a.VERSION_ID).FirstOrDefault();
                    //store in model
                    thisPubPULA.AI = thisAI.INGREDIENT_NAME;
                    thisPubPULA.AI_ID = thisAI.ACTIVE_INGREDIENT_ID.ToString();
                }
                if (pl.PRODUCT_ID != null && pl.PRODUCT_ID != 0) {
                    //get Active Ingredient
                    request = new RestRequest();
                    request.Resource = "/Products?ProductID={productID}&publishedDate={date}";
                    request.RootElement = "ArrayOfPRODUCT";
                    request.AddParameter("productID", pl.PRODUCT_ID, ParameterType.UrlSegment);
                    List < PRODUCT > prodList = serviceCaller.Execute < List < PRODUCT >> (request);
                    //give me newest version
                    PRODUCT thisprod = prodList.OrderByDescending(a => a.VERSION_ID).FirstOrDefault();
                    //store in model
                    thisPubPULA.Product = thisprod.PRODUCT_NAME;
                    thisPubPULA.Prod_ID = thisprod.PRODUCT_ID.ToString();
                    thisPubPULA.Prod_RegNum = thisprod.PRODUCT_REGISTRATION_NUMBER;
                }

                //get crop use
                request = new RestRequest();
                request.Resource = "/CropUses?CropUseID={cropUseID}&publishedDate={date}";
                request.RootElement = "ArrayOfCROP_USE";
                request.AddParameter("cropUseID", pl.CROP_USE_ID, ParameterType.UrlSegment);
                List < CROP_USE > cuList = serviceCaller.Execute < List < CROP_USE >> (request);
                //give me the newest version
                CROP_USE thisCropUse = cuList.OrderByDescending(cu => cu.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.CropUse = thisCropUse.USE;
                thisPubPULA.CropUse_ID = thisCropUse.CROP_USE_ID.ToString();

                //get application method
                APPLICATION_METHOD thisAppMethod = GetApplicationMethod(pl.APPLICATION_METHOD_ID);
                //store in model
                thisPubPULA.AppMethod = thisAppMethod.METHOD;
                thisPubPULA.AppMeth_ID = thisAppMethod.APPLICATION_METHOD_ID.ToString();

                //get formulation
                request = new RestRequest();
                request.Resource = "/Formulations?FormulationID={formulationID}&publishedDate={date}";
                request.RootElement = "ArrayOfFORMULATION";
                request.AddParameter("formulationID", pl.FORMULATION_ID, ParameterType.UrlSegment);
                List < FORMULATION > formList = serviceCaller.Execute < List < FORMULATION >> (request);
                //give me the newest version
                FORMULATION thisFormulation = formList.OrderByDescending(m => m.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.Formulation = thisFormulation.FORM;
                thisPubPULA.Form_ID = thisFormulation.FORMULATION_ID.ToString();

                //get limitation code
                request = new RestRequest();
                request.Resource = "/Limitations/{limitationID}?publishedDate={date}";
                request.RootElement = "ArrayOfLIMITATION";
                request.AddParameter("limitationID", pl.LIMITATION_ID, ParameterType.UrlSegment);
                List < LIMITATION > lList = serviceCaller.Execute < List < LIMITATION >> (request);
                //give me the newest version
                LIMITATION thislimitation = lList.OrderByDescending(l => l.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.Code = thislimitation.CODE;
                thisPubPULA.Code_ID = thislimitation.LIMITATION_ID.ToString();
                thisPubPULA.Limitation = thislimitation.LIMITATION1;

                PubPulaLists.Add(thisPubPULA);
            }

            ViewData["PULAlimitationList"] = PubPulaLists;

            //get Events
            request = new RestRequest();
            request.Resource = "Events/";
            request.RootElement = "ArrayOfEVENT";
            ViewData["EventList"] = serviceCaller.Execute < List < EVENT >> (request);

            //get months and years lists (1 each for Effective Data and Expiration Date) (pass chosen if there is one)
            if (thisPULA.EFFECTIVE_DATE != null) {
                ViewBag.EffMonths = new SelectList(GetMonthsList(), "Value", "Text", ((DateTime) thisPULA.EFFECTIVE_DATE).Month);
                ViewBag.EffYears = GetEffectYears().Select(x => new SelectListItem {
                    Selected = x.Text == ((DateTime) thisPULA.EFFECTIVE_DATE).Year.ToString(),
                        Text = x.Text,
                        Value = x.Text.ToString()
                });
            } else {
                ViewBag.EffMonths = new SelectList(GetMonthsList(), "Value", "Text");
                ViewBag.EffYears = GetEffectYears().Select(x => new SelectListItem {
                    Text = x.Text,
                        Value = x.Text.ToString()
                });
            }
            if (thisVersion.EXPIRED_TIME_STAMP != null) {
                ViewBag.ExMonths = new SelectList(GetMonthsList(), "Value", "Text", ((DateTime) thisVersion.EXPIRED_TIME_STAMP).Month);
                ViewBag.ExYears = GetYearList().Select(x => new SelectListItem {
                    Selected = x.Text == ((DateTime) thisVersion.EXPIRED_TIME_STAMP).Year.ToString(),
                        Text = x.Text,
                        Value = x.Text.ToString()
                });
            } else {
                ViewBag.ExMonths = new SelectList(GetMonthsList(), "Value", "Text");
                ViewBag.ExYears = new SelectList(GetYearList(), "Value", "Text");
            }

            //get species
            request = new RestRequest();
            request.Resource = "/SimpleSpecies";
            request.RootElement = "ArrayOfSpecies";
            SpeciesList SppList = serviceCaller.Execute < SpeciesList > (request);

            ViewData["SpeciesListCom"] = SppList.SPECIES.OrderBy(X => X.COMNAME).ToList();
            ViewData["SpeciesListScie"] = SppList.SPECIES.OrderBy(x => x.SCINAME).ToList();
            ViewData["SpeciesListEntity"] = SppList.SPECIES.OrderBy(x => x.ENTITY_ID).ToList();

            //get logged in User
            ViewData["loggedIn"] = GetLoggedInUser();

            return PartialView(thisPULA);
        }

        //Post to Publish the PULA (NEED TO TEST THIS)
        [HttpPost]
        public ActionResult PULAEdit(PULA_Model thisPULA, string Create) {
            if (Create == "Cancel") {
                return RedirectToAction("PULA_Details", new {
                    shapeId = thisPULA.anAIPULA.PULA_SHAPE_ID, date = DateTime.Now
                });
            }

            ACTIVE_INGREDIENT_PULA updatedPULA = new ACTIVE_INGREDIENT_PULA();
            try {
                //if Create == "Save Changes" or "Publish", Update everything

                ACTIVE_INGREDIENT_PULA anAIPULA = thisPULA.anAIPULA;
                if (thisPULA.EffMonths != null) {
                    string EffectiveMonth = thisPULA.EffMonths;
                    string EffectiveYear = thisPULA.EffYears;
                    string effectiveDate = EffectiveMonth + "/01/" + EffectiveYear;
                    anAIPULA.EFFECTIVE_DATE = DateTime.Parse(effectiveDate);
                }
                BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
                var request = new RestRequest(Method.POST);
                request.Resource = "/PULAs/{entityID}";
                request.RequestFormat = DataFormat.Xml;
                request.AddParameter("entityID", anAIPULA.ID, ParameterType.UrlSegment);
                request.AddHeader("X-HTTP-Method-Override", "PUT");
                //Use extended serializer
                BLTWebSerializer serializer = new BLTWebSerializer();
                request.AddParameter("application/xml", serializer.Serialize < ACTIVE_INGREDIENT_PULA > (anAIPULA), ParameterType.RequestBody);
                updatedPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

                //update expire timestamp on version if changed
                if (thisPULA.ExpirationChanged == "true") {
                    string ExpireMonth = thisPULA.ExMonths;
                    string ExpireYear = thisPULA.ExYears;
                    string expirationDate = ExpireMonth + "/01/" + ExpireYear;
                    request = new RestRequest();
                    request.Resource = "/PULAs/{entityID}/updateStatus?status={status}&statusDate={date}";
                    request.RootElement = "ACTIVE_INGREDIENT_PULA";
                    request.AddParameter("entityID", updatedPULA.ID, ParameterType.UrlSegment);
                    request.AddParameter("status", "EXPIRED", ParameterType.UrlSegment);
                    request.AddParameter("date", expirationDate, ParameterType.UrlSegment);
                    ACTIVE_INGREDIENT_PULA updatedPULA2 = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);
                }

                //update spp
                //see if any were removed
                if (thisPULA.SpeciesToRemove != null) {
                    SpeciesList SppList = new SpeciesList();
                    string[] RemoveSpp = Regex.Split(thisPULA.SpeciesToRemove, ",");
                    List < Int32 > speciesIDs = new List < int > ();
                    foreach(string rs in RemoveSpp) {
                        if (!(string.IsNullOrWhiteSpace(rs))) {
                            speciesIDs.Add(Convert.ToInt32(rs));
                        }
                    }
                    SppList.SPECIES = speciesIDs.Select(s => new SimpleSpecies {
                        ENTITY_ID = s
                    }).ToList < SimpleSpecies > ();
                    //now remove all of them
                    request = new RestRequest(Method.POST);
                    request.Resource = "/PULAs/{entityID}/RemoveSpeciesFromPULA?publishedDate={date}";
                    request.RootElement = "SpeciesList";
                    request.AddParameter("entityID", updatedPULA.PULA_ID, ParameterType.UrlSegment);
                    request.AddHeader("Content-Type", "application/xml");
                    //Use extended serializer
                    serializer = new BLTWebSerializer();
                    request.AddParameter("application/xml", serializer.Serialize < SpeciesList > (SppList), ParameterType.RequestBody);
                    serviceCaller.Execute < SpeciesList > (request);
                }

                //now add the spp
                if (thisPULA.SpeciesToAdd != null) {
                    SpeciesList aSppList = new SpeciesList();
                    string[] AddSpp = Regex.Split(thisPULA.SpeciesToAdd, ",");
                    List < Int32 > sppIDs = new List < int > ();
                    foreach(string addS in AddSpp) {
                        if (!(string.IsNullOrWhiteSpace(addS))) {
                            sppIDs.Add(Convert.ToInt32(addS));
                        }
                    }
                    aSppList.SPECIES = sppIDs.Select(s => new SimpleSpecies {
                        ENTITY_ID = s
                    }).ToList < SimpleSpecies > ();
                    //now add all of them
                    request = new RestRequest(Method.POST);
                    request.Resource = "/PULAs/{entityID}/AddSpeciesToPULA?publishedDate={date}";
                    request.RootElement = "SpeciesList";
                    request.AddParameter("entityID", updatedPULA.PULA_ID, ParameterType.UrlSegment);
                    request.AddHeader("Content-Type", "application/xml");
                    //Use extended serializer
                    serializer = new BLTWebSerializer();
                    request.AddParameter("application/xml", serializer.Serialize < SpeciesList > (aSppList), ParameterType.RequestBody);
                    serviceCaller.Execute < SpeciesList > (request);
                }

                if (thisPULA.ExistingLimitToRemove != null) {
                    string[] RemoveLim = Regex.Split(thisPULA.ExistingLimitToRemove, ",");
                    foreach(string rl in RemoveLim) {
                        if (!(string.IsNullOrWhiteSpace(rl))) {
                            //now removeit
                            request = new RestRequest(Method.POST);
                            request.Resource = "/PULALimitation/{entityID}";
                            request.AddParameter("entityID", Convert.ToInt32(rl), ParameterType.UrlSegment);
                            request.AddHeader("X-HTTP-Method-Override", "DELETE");
                            request.AddHeader("Content-Type", "application/xml");
                            serviceCaller.Execute < PULA_LIMITATIONS > (request);
                        }
                    }
                }

                //now add the pula limitations
                if (thisPULA.LimitationsToAdd != null) {
                    //PULA_LIMITATIONS
                    List < PULA_LIMITATIONS > pulaLimitations = new List < PULA_LIMITATIONS > ();
                    // parse it out by the [ ]
                    string[] eachLim = Regex.Split(thisPULA.LimitationsToAdd, "]");

                    // find out if its an A or P (AI or Product) at the start
                    foreach(string e in eachLim) {
                        PULA_LIMITATIONS thisLimit = new PULA_LIMITATIONS();
                        if (e.Contains("A")) {
                            //it's an AI limitation (aiID,useID,amID,formID,codeID )
                            //parse it again on the "," 
                            string[] aiLimit = Regex.Split(e, ",");
                            aiLimit = aiLimit.Where(x => !string.IsNullOrEmpty(x)).ToArray();
                            if (aiLimit[0] != "0") {
                                thisLimit.PULA_ID = updatedPULA.PULA_ID;
                                thisLimit.ACTIVE_INGREDIENT_ID = Convert.ToDecimal(aiLimit[0].Substring(2)); //errored here.. check this 
                                thisLimit.CROP_USE_ID = Convert.ToDecimal(aiLimit[1]);
                                thisLimit.APPLICATION_METHOD_ID = Convert.ToDecimal(aiLimit[2]);
                                thisLimit.FORMULATION_ID = Convert.ToDecimal(aiLimit[3]);
                                thisLimit.LIMITATION_ID = Convert.ToDecimal(aiLimit[4]);
                            }
                        } else if (e.Contains("P")) {
                            //it's a Product Limitation (prodID,useID,amID,formID,codeID )
                            string[] prLimit = Regex.Split(e, ",");
                            prLimit = prLimit.Where(x => !string.IsNullOrEmpty(x)).ToArray();
                            if (prLimit[0] != "0") {

                                thisLimit.PULA_ID = updatedPULA.PULA_ID;
                                thisLimit.PRODUCT_ID = Convert.ToDecimal(prLimit[0].Substring(2));
                                thisLimit.CROP_USE_ID = Convert.ToDecimal(prLimit[1]);
                                thisLimit.APPLICATION_METHOD_ID = Convert.ToDecimal(prLimit[2]);
                                thisLimit.FORMULATION_ID = Convert.ToDecimal(prLimit[3]);
                                thisLimit.LIMITATION_ID = Convert.ToDecimal(prLimit[4]);
                            }
                        }
                        //add it to the list of PULALimitations to POST (make sure there's a populated pulaLimitation first
                        if (thisLimit.FORMULATION_ID > 0) {
                            pulaLimitations.Add(thisLimit);
                        }
                    }

                    //now that i have the pula-limitations, post them
                    foreach(PULA_LIMITATIONS pl in pulaLimitations) {
                        //post it
                        request = new RestRequest(Method.POST);
                        request.Resource = "PULALimitations";
                        request.AddHeader("Content-Type", "application/xml");
                        //Use extended serializer
                        serializer = new BLTWebSerializer();
                        request.AddParameter("application/xml", serializer.Serialize < PULA_LIMITATIONS > (pl), ParameterType.RequestBody);
                        PULA_LIMITATIONS createdPULALimit = serviceCaller.Execute < PULA_LIMITATIONS > (request);
                    }
                } //end if (thisPULA.LimitationsToAdd != null)


                if (Create == "Publish PULA") {
                    request = new RestRequest();
                    request.Resource = "/PULAs/{entityID}/updateStatus?status={status}&statusDate={date}";
                    request.RootElement = "ACTIVE_INGREDIENT_PULA";
                    request.AddParameter("entityID", updatedPULA.ID, ParameterType.UrlSegment);
                    request.AddParameter("status", "published", ParameterType.UrlSegment);
                    request.AddParameter("date", DateTime.Now.Date, ParameterType.UrlSegment);
                    //ACTIVE_INGREDIENT_PULA publishedPULA = serviceCaller.Execute<ACTIVE_INGREDIENT_PULA>(request);
                    //may be null coming back if effective date is > published date or not set at all
                } //end if (Create == "Publish PULA")

                return RedirectToAction("PULA_Details", new {
                    shapeId = updatedPULA.PULA_SHAPE_ID, date = DateTime.Now, status = "update"
                });
            } catch {
                return RedirectToAction("ErrorPage");
            }
        }

        //Published from Details page, passing in PULA.ID
        public ActionResult PULA_Publish(int id) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "/PULAs/{entityID}/updateStatus?status={status}&statusDate={date}";
            request.RootElement = "ACTIVE_INGREDIENT_PULA";
            request.AddParameter("entityID", id, ParameterType.UrlSegment);
            request.AddParameter("status", "published", ParameterType.UrlSegment);
            request.AddParameter("date", DateTime.Now, ParameterType.UrlSegment);
            ACTIVE_INGREDIENT_PULA publishedPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

            ViewData["UpdatePULA"] = "Created";

            return RedirectToAction("PULA_Details", new {
                shapeId = publishedPULA.PULA_SHAPE_ID, date = DateTime.Now, status = "update"
            });

        }

        //PULA clicked from Guest log in - limited view
        //GET: /Contributor_Details/11
        public PartialViewResult Contributor_Details(int shapeId) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();

            //get the ACTIVE_INGREDIENT_PULA -- not published yet, only created for contibutors to look at
            request.Resource = "/PULAs/POI/{shapeId}?publishedDate={date}";
            request.RootElement = "ACTIVE_INGREDIENT_PULA";
            request.AddParameter("shapeId", shapeId, ParameterType.UrlSegment);
            ACTIVE_INGREDIENT_PULA thisPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

            //store shape id to pass on
            ViewData["shapeId"] = shapeId;

            //get the PULA_LIMITATIONs
            request = new RestRequest();
            request.Resource = "PULAs/{pulaID}/PULALimitations?ActiveDate={date}";
            request.RootElement = "ArrayOfPULA_LIMITATIONS";
            request.AddParameter("pulaID", thisPULA.PULA_ID, ParameterType.UrlSegment);
            List < PULA_LIMITATIONS > PULALimitationList = serviceCaller.Execute < List < PULA_LIMITATIONS >> (request);

            //to store each row in the table for display
            List < PULALimitation > PubPulaLists = new List < PULALimitation > ();
            //get all the Limitation parts
            foreach(PULA_LIMITATIONS pl in PULALimitationList) {
                PULALimitation thisPubPULA = new PULALimitation();
                if (pl.ACTIVE_INGREDIENT_ID != null && pl.ACTIVE_INGREDIENT_ID != 0) {
                    //get Active Ingredient
                    request = new RestRequest();
                    request.Resource = "/ActiveIngredients?aiID={activeIngredientID}&publishedDate={date}";
                    request.RootElement = "ArrayOfACTIVE_INGREDIENT";
                    request.AddParameter("activeIngredientID", pl.ACTIVE_INGREDIENT_ID, ParameterType.UrlSegment);
                    List < ACTIVE_INGREDIENT > aiList = serviceCaller.Execute < List < ACTIVE_INGREDIENT >> (request);
                    //give me newest version
                    ACTIVE_INGREDIENT thisAI = aiList.OrderByDescending(a => a.VERSION_ID).FirstOrDefault();
                    //store in model
                    thisPubPULA.AI = thisAI.INGREDIENT_NAME;
                    thisPubPULA.AI_ID = thisAI.ID.ToString();
                }
                if (pl.PRODUCT_ID != null && pl.PRODUCT_ID != 0) {
                    //get Active Ingredient
                    request = new RestRequest();
                    request.Resource = "/Products?ProductID={productID}&publishedDate={date}";
                    request.RootElement = "ArrayOfPRODUCT";
                    request.AddParameter("productID", pl.PRODUCT_ID, ParameterType.UrlSegment);
                    List < PRODUCT > prodList = serviceCaller.Execute < List < PRODUCT >> (request);
                    //give me newest version
                    PRODUCT thisprod = prodList.OrderByDescending(a => a.VERSION_ID).FirstOrDefault();
                    //store in model
                    thisPubPULA.Product = thisprod.PRODUCT_NAME;
                    thisPubPULA.Prod_ID = thisprod.ID.ToString();
                    thisPubPULA.Prod_RegNum = thisprod.PRODUCT_REGISTRATION_NUMBER;
                }

                //get crop use
                request = new RestRequest();
                request.Resource = "/CropUses?CropUseID={cropUseID}&publishedDate={date}";
                request.RootElement = "ArrayOfCROP_USE";
                request.AddParameter("cropUseID", pl.CROP_USE_ID, ParameterType.UrlSegment);
                List < CROP_USE > cuList = serviceCaller.Execute < List < CROP_USE >> (request);
                //give me the newest version
                CROP_USE thisCropUse = cuList.OrderByDescending(cu => cu.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.CropUse = thisCropUse.USE;
                thisPubPULA.CropUse_ID = thisCropUse.ID.ToString();

                //get application Method
                APPLICATION_METHOD thisAppMethod = GetApplicationMethod(pl.APPLICATION_METHOD_ID);
                //store in model
                thisPubPULA.AppMethod = thisAppMethod.METHOD;
                thisPubPULA.AppMeth_ID = thisAppMethod.ID.ToString();

                //get formulation
                request = new RestRequest();
                request.Resource = "/Formulations?FormulationID={formulationID}&publishedDate={date}";
                request.RootElement = "ArrayOfFORMULATION";
                request.AddParameter("formulationID", pl.FORMULATION_ID, ParameterType.UrlSegment);
                List < FORMULATION > formList = serviceCaller.Execute < List < FORMULATION >> (request);
                //give me the newest version
                FORMULATION thisFormulation = formList.OrderByDescending(m => m.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.Formulation = thisFormulation.FORM;
                thisPubPULA.Form_ID = thisFormulation.ID.ToString();

                //get limitation code
                request = new RestRequest();
                request.Resource = "/Limitations/{limitationID}?publishedDate={date}";
                request.RootElement = "ArrayOfLIMITATION";
                request.AddParameter("limitationID", pl.LIMITATION_ID, ParameterType.UrlSegment);
                List < LIMITATION > lList = serviceCaller.Execute < List < LIMITATION >> (request);
                //give me the newest version
                LIMITATION thislimitation = lList.OrderByDescending(l => l.VERSION_ID).FirstOrDefault();
                //store in model
                thisPubPULA.Code = thislimitation.CODE;
                thisPubPULA.Code_ID = thislimitation.ID.ToString();
                thisPubPULA.Limitation = thislimitation.LIMITATION1;

                PubPulaLists.Add(thisPubPULA);
            }

            ViewData["PULAlimitationList"] = PubPulaLists;

            ////need unique codes for the Code Limitation table...
            List < PULALimitation > uniqueList = PubPulaLists.GroupBy(p => p.Code).Select(g => g.First()).ToList();
            ViewData["UniqueCodes"] = uniqueList;

            return PartialView(thisPULA);
        }

        //Post the comments from contributor
        [HttpPost]
        public ActionResult ContributorDetails(PULA_Model thisPULA) {
            try {
                ACTIVE_INGREDIENT_PULA anAIPula = new ACTIVE_INGREDIENT_PULA();
                string commentName = thisPULA.CommentName;
                string commentOrg = thisPULA.CommentOrg;
                string comment = thisPULA.Comment;
                string fullCOMMENT = "[" + commentName + "|" + commentOrg + "|" + comment + "]";
                anAIPula.COMMENTS = fullCOMMENT;

                BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
                var request = new RestRequest(Method.POST);

                request.Resource = "/PULAs/{pulaID}/AddComments";
                request.RequestFormat = DataFormat.Xml;
                request.AddParameter("pulaID", thisPULA.anAIPULA.ID, ParameterType.UrlSegment);
                request.AddHeader("X-HTTP-Method-Override", "PUT");
                request.AddHeader("Content-Type", "application/xml");
                //Use extended serializer
                BLTWebSerializer serializer = new BLTWebSerializer();
                request.AddParameter("application/xml", serializer.Serialize < ACTIVE_INGREDIENT_PULA > (anAIPula), ParameterType.RequestBody);
                serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

                return RedirectToAction("ThankYou");
            } catch (Exception e) {
                return RedirectToAction("Error", e.ToString());
            }
        }

        //expiration date was added
        public string AddExpiration(string month, string year, int PulaID, int loggedInID) {
            try {
                //build the date
                string Month = month;
                string fullDate = Month + "/01/" + year;
                DateTime ExpireDate = Convert.ToDateTime(fullDate);

                //get the version
                BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
                var request = new RestRequest();
                request.Resource = "/PULAs/{entityID}/updateStatus?status={status}&statusDate={date}";
                request.RootElement = "ACTIVE_INGREDIENT_PULA";
                request.AddParameter("entityID", PulaID, ParameterType.UrlSegment);
                request.AddParameter("status", "EXPIRED", ParameterType.UrlSegment);
                request.AddParameter("date", ExpireDate, ParameterType.UrlSegment);
                serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

                return "<label class='inline'>" + fullDate + "</label>";
            } catch {
                return "Did not work";
            }
        }

        //picked an AI from dropdown, return list of Products
        public JsonResult GetProductsByAI(int id) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "/ActiveIngredients/{activeIngredientID}/Product?publishedDate={date}";
            request.RootElement = "ArrayOfPRODUCT";
            request.AddParameter("activeIngredientID", id, ParameterType.UrlSegment);

            List < PRODUCT > Prodlist = serviceCaller.Execute < List < PRODUCT >> (request);
            Prodlist = Prodlist.OrderBy(x => x.PRODUCT_NAME).ToList();
            return Json(Prodlist);
        }

        //pula has been saved, thank you page
        //GET: /ThankYou
        public PartialViewResult ThankYou() {
            //pula was successfully saved, here's the thank you page with a close button. when user clicks pula again, will
            //have publish option available.
            return PartialView();
        }

        public ActionResult ErrorPage() {
            //pula was not successfully saved, here's the error page with a close button. 
            return PartialView();
        }

        //get PULAs based on filteres
        //GET: PULAs?
        public JsonResult GetFilteredSimplePULAs(string fDate, string eventID, string productID, string activeIngredientID) {
            string FormattedDate = "0";
            DateTime ? chosenDate = null;

            if (fDate != "0") {
                string unFormattedDate = fDate;
                int monthEnd = unFormattedDate.IndexOf(" ");
                if (monthEnd <= 0)
                    monthEnd = unFormattedDate.IndexOf("+");
                string month = unFormattedDate.Substring(0, monthEnd);
                string year = unFormattedDate.Substring(monthEnd + 1, 4);
                chosenDate = Convert.ToDateTime(month + "/01/" + year).AddMonths(1).AddDays(-1);
                FormattedDate = chosenDate.Value.ToShortDateString();
            }


            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "PULAs/FilteredSimplePULAs?date={date}&aiID={activeIngredientID}&productID={productID}&eventID={eventID}";
            request.RootElement = "ArrayOfPULA";
            request.AddParameter("date", FormattedDate, ParameterType.UrlSegment);
            request.AddParameter("activeIngredientID", Convert.ToInt32(activeIngredientID), ParameterType.UrlSegment);
            request.AddParameter("productID", Convert.ToInt32(productID), ParameterType.UrlSegment);
            request.AddParameter("eventID", Convert.ToInt32(eventID), ParameterType.UrlSegment);

            PULAList PULAlist = serviceCaller.Execute < PULAList > (request);
            //send back CreatedList, PublishedList, EffectiveList

            PULAList PublishedList = new PULAList();
            PULAList EffectiveList = new PULAList();
            PULAList ExpiredList = new PULAList();

            //published if (effective is null OR after chosenDate) AND (expired is null or after chosendate)
            PublishedList.PULA = PULAlist.PULA.Where(x => ((!x.Effective.HasValue) || (x.Effective.Value >= chosenDate)) && ((!x.Expired.HasValue) || (x.Expired.Value >= chosenDate))).ToList();
            //effective if (effective is <= chosen date AND (expired is nll OR after chosenDate)
            EffectiveList.PULA = PULAlist.PULA.Where(x => ((x.Effective.Value <= chosenDate) && ((!x.Expired.HasValue) || (x.Expired.Value > chosenDate)))).ToList();
            ExpiredList.PULA = PULAlist.PULA.Where(x => (x.Expired.HasValue && x.Expired.Value <= chosenDate)).ToList();

            List < object > allOfThem = new List < object > ();
            allOfThem.Add(PublishedList.PULA);
            allOfThem.Add(EffectiveList.PULA);
            allOfThem.Add(ExpiredList.PULA);

            return Json(allOfThem, JsonRequestBehavior.AllowGet);
        }

        #
        region Called Often

        //call for who the member logged in is 

        private APPLICATION_METHOD GetApplicationMethod(decimal ? appMethod_id) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "/ApplicationMethods?applicationMethodID={applicationMethodID}&publishedDate={date}";
            request.RootElement = "ArrayOfAPPLICATION_METHOD";
            request.AddParameter("applicationMethodID", appMethod_id, ParameterType.UrlSegment);
            List < APPLICATION_METHOD > amList = serviceCaller.Execute < List < APPLICATION_METHOD >> (request);
            //give me the newest version
            APPLICATION_METHOD thisAppMethod = amList.OrderByDescending(m => m.VERSION_ID).FirstOrDefault();
            return thisAppMethod;
        }

        private USER_ GetLoggedInUser() {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "Users?username={userName}";
            request.RootElement = "USER_";
            request.AddParameter("userName", User.Identity.Name, ParameterType.UrlSegment);
            USER_ loggedInUser = serviceCaller.Execute < USER_ > (request);

            return loggedInUser;
        }

        //populate a list for Months
        private List < SelectListItem > GetMonthsList() {
            List < SelectListItem > Months = new List < SelectListItem > ();
            Months.Add(new SelectListItem {
                Text = "January", Value = "01"
            });
            Months.Add(new SelectListItem {
                Text = "February", Value = "02"
            });
            Months.Add(new SelectListItem {
                Text = "March", Value = "03"
            });
            Months.Add(new SelectListItem {
                Text = "April", Value = "04"
            });
            Months.Add(new SelectListItem {
                Text = "May", Value = "05"
            });
            Months.Add(new SelectListItem {
                Text = "June", Value = "06"
            });
            Months.Add(new SelectListItem {
                Text = "July", Value = "07"
            });
            Months.Add(new SelectListItem {
                Text = "August", Value = "08"
            });
            Months.Add(new SelectListItem {
                Text = "September", Value = "09"
            });
            Months.Add(new SelectListItem {
                Text = "October", Value = "10"
            });
            Months.Add(new SelectListItem {
                Text = "November", Value = "11"
            });
            Months.Add(new SelectListItem {
                Text = "December", Value = "12"
            });
            return Months;
        }

        //populate list for years for effective date
        private SelectList GetEffectYears() {
            var Years = new SelectList(Enumerable.Range(2009, (DateTime.Now.Year - 2009) + 5));

            return Years;
        }

        //get PULAs based on EventID for contributor logged in 
        //GET: PULas
        public JsonResult GetEventPULAs(string eventId) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "/Events/{eventId}/PULAs";
            request.RootElement = "ArrayOfPULA";
            request.AddParameter("eventId", Convert.ToInt32(eventId), ParameterType.UrlSegment);
            PULAList PULAlist = serviceCaller.Execute < PULAList > (request);

            //send back CreatedList
            PULAList CreatedList = new PULAList();

            CreatedList.PULA = PULAlist.PULA.Where(x => (x.Created <= DateTime.Now.Date && x.isPublished < 1) && x.Expired == null).ToList();

            return Json(CreatedList.PULA, JsonRequestBehavior.AllowGet);
        }

        //populate a list for Years
        private SelectList GetYearList() {
            var Years = new SelectList(Enumerable.Range(DateTime.Now.Year, 5));

            return Years;
            //List<SelectListItem> Years = new List<SelectListItem>();
            //Years.Add(new SelectListItem { Text = (DateTime.Now.Year).ToString(), Value = (DateTime.Now.Year).ToString() });
            //Years.Add(new SelectListItem { Text = (DateTime.Now.AddYears(1).Year).ToString(), Value = (DateTime.Now.AddYears(1).Year).ToString() });
            //Years.Add(new SelectListItem { Text = (DateTime.Now.AddYears(2).Year).ToString(), Value = (DateTime.Now.AddYears(2).Year).ToString() });
            //Years.Add(new SelectListItem { Text = (DateTime.Now.AddYears(3).Year).ToString(), Value = (DateTime.Now.AddYears(3).Year).ToString() });
            //Years.Add(new SelectListItem { Text = (DateTime.Now.AddYears(4).Year).ToString(), Value = (DateTime.Now.AddYears(4).Year).ToString() }); 
            //return Years;
        }

        #
        endregion Called Often

        //export the Comments to csv
            [HttpPost]
        public ActionResult ExportCSV(Int32 pulaId) {
            BLTServiceCaller serviceCaller = BLTServiceCaller.Instance;
            var request = new RestRequest();
            request.Resource = "/PULAs/{entityID}";
            request.RootElement = "ACTIVE_INGREDIENT_PULA";
            request.AddParameter("entityID", pulaId, ParameterType.UrlSegment);
            ACTIVE_INGREDIENT_PULA thisPULA = serviceCaller.Execute < ACTIVE_INGREDIENT_PULA > (request);

            StringBuilder sb = GetFormattedExportContent(thisPULA);

            string aDate = DateTime.Now.ToShortDateString();

            return File(new System.Text.UTF8Encoding().GetBytes(sb.ToString()), "text/csv", "PULAComments_" + aDate + ".csv");

        }

        private StringBuilder GetFormattedExportContent(ACTIVE_INGREDIENT_PULA pula) {
            StringBuilder sb = new StringBuilder();

            string[] comments = pula.COMMENTS.Split(new char[] {
                '[', ']'
            }, StringSplitOptions.RemoveEmptyEntries);
            List < CommentsModel > allComments = new List < CommentsModel > ();
            foreach(string c in comments) {
                CommentsModel aComment = new CommentsModel();
                string[] aCom = c.Split('|');
                foreach(string ac in aCom) {
                    aComment.Name = aCom[0];
                    aComment.Org = aCom[1];
                    aComment.Comment = aCom[2];
                }
                allComments.Add(aComment);
            }

            string header1 = "PULA Comments";
            sb.AppendLine(header1);

            sb.AppendLine("Name,Organization,Comment");
            foreach(var c in allComments) {
                sb.AppendLine(c.Name + "," + c.Org + "," + c.Comment);
            }

            return sb;

        }

        private string GetThisMonth(int num) {
            string monthName = string.Empty;
            switch (num) {
            case 1:
                monthName = "January ";
                break;
            case 2:
                monthName = "February ";
                break;
            case 3:
                monthName = "March ";
                break;
            case 4:
                monthName = "April ";
                break;
            case 5:
                monthName = "May ";
                break;
            case 6:
                monthName = "June ";
                break;
            case 7:
                monthName = "July ";
                break;
            case 8:
                monthName = "August ";
                break;
            case 9:
                monthName = "September ";
                break;
            case 10:
                monthName = "October ";
                break;
            case 11:
                monthName = "November ";
                break;
            case 12:
                monthName = "December ";
                break;
            }
            return monthName;
        }
    }
}