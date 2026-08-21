import Button from "@/components/atoms/Button";
import { APP_PATHS } from "@/lib/constants/paths";
import { NP } from "@/lib/constants/strings";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-primary text-white">
      <div className="flex flex-col gap-10 justify-center items-center">
        <div className="flex flex-col justify-center items-center">
          <h1 className="font-bold">{NP.NAME}</h1>
          <h2>{NP.TAGLINE}</h2>
        </div>
        <div className="flex flex-col w-full gap-5">
          <Link href={APP_PATHS.ADMIN_PORTAL}>
            <Button variant="inverted">
              <h3>Admin Portal</h3>
            </Button>
          </Link>
          <Link href={APP_PATHS.REQUEST}>
            <Button variant="inverted">
              <h3>Request an item</h3>
            </Button>
          </Link>
          <Link href={APP_PATHS.COOL}>
            <Button variant="inverted">
              <h3>Something cool!</h3>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
