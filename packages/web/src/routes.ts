import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { SportsView } from "./views/Sports";
import Layout from "./Layout";
import { PaymentsView } from "./views/Payments";
import { LockersView } from "./views/Lockers";
import { MedicalCertificateView } from "./views/MedicalCertificate";

export let router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        path: "/",
        Component: HomeView,
      },
      {
        path: "/members",
        Component: MembersView,
      },
      {
        path: "/sports",
        Component: SportsView,
      },
      {
        path: "/payments",
        Component: PaymentsView,
      },
      {
        path: "/lockers",
        Component: LockersView,
      },
      {
        path: "/medicalcertificate",
        Component: MedicalCertificateView,
      }


    ],
  },
]);
