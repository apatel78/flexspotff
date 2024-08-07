import clsx from "clsx";
import { useState, useRef } from "react";

import type { NFLTeam } from "~/models/nflteam.server";
import type { 
    TeamPick, 
    LocksGameByYearAndWeekElement } from "~/models/locksgame.server";
import type { LocksGamePick } from "~/models/locksgamepicks.server";

import Button from "~/components/ui/Button";

import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"


const formatSpread = (amount: number, home: boolean) => {
  if (amount === 0) return `Even`;
  const displayAmount = home ? amount : -1 * amount;
  const prefix = displayAmount > 0 ? "+" : "";
  return `${prefix}${displayAmount}`;
};

type Props = {
  handleChange: (teamPick: TeamPick[]) => void;
  locksGame: LocksGameByYearAndWeekElement;
  existingPick?: TeamPick;
  existingLocksGamePick?: LocksGamePick;
};

export default function LocksChallengeGameComponent({
  handleChange,
  locksGame,
  existingPick,
  existingLocksGamePick,
}: Props) {
  const existingTeamPick =
    [locksGame.game.homeTeam, locksGame.game.awayTeam].find(
      (team) => team.id === existingPick?.teamId
    ) || null;
  const [pickedTeam, setPickedTeam] = useState<NFLTeam | null>(existingTeamPick);
  const [showSlider, setShowSlider] = useState(false);
  const [isBetActive, setIsBetActive] = useState(existingLocksGamePick?.isActive);

  const pickSliderDefault = (!existingPick || !isBetActive)
    ? 0
    : existingPick.teamId === locksGame.game.awayTeamId
    ? -1
    : 1;

  const pickedTeamDisplay =
  (existingPick?.teamId !== null  && isBetActive) ? `${pickedTeam?.mascot}` : "No Selection";

  const gameDateTime = locksGame.game.gameStartTime;
  const now = new Date();
  const pickLocked = gameDateTime && gameDateTime < now;

  const wonGame =
    existingLocksGamePick &&
    existingLocksGamePick.isWin;

  const lostGame =
    existingLocksGamePick &&
    existingLocksGamePick.isLoss;

  const onPickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (+e.target.value > 0) {
      setPickedTeam(locksGame.game.homeTeam);
      handleChange([
        { teamId: locksGame.game.homeTeam.id,
          isActive: 1
        },
        { teamId: locksGame.game.awayTeam.id,
          isActive: 0
        },
      ]);
      setIsBetActive(1);
    } else if (+e.target.value < 0) {
      setPickedTeam(locksGame.game.awayTeam);
      handleChange([
        { teamId: locksGame.game.awayTeam.id,
          isActive: 1
        },
        { teamId: locksGame.game.homeTeam.id,
          isActive: 0
        },
      ]);
      setIsBetActive(1);
    } else {
      setPickedTeam(null);
      handleChange([
        { teamId: locksGame.game.homeTeam.id,
          isActive: 0
        },
        { teamId: locksGame.game.awayTeam.id,
          isActive: 0
        },
      ]);
      setIsBetActive(0);
    }
  };

  const displayPickInput = () => {
    setShowSlider(true);
  };

  const resetPick = () => {
    setPickedTeam(null);
    handleChange([
      { teamId: locksGame.game.homeTeam.id,
        isActive: 0
      },
      { teamId: locksGame.game.awayTeam.id,
        isActive: 0
      },
    ]);
    setIsBetActive(0);
    setShowSlider(false);
  };

  return (
    <div
      className={clsx(
        "p-4",
        //betAmount !== 0 && "bg-slate-800",
        wonGame && "bg-green-900",
        lostGame && "bg-red-900"
      )}
    >
      <div className="flex gap-2 justify-between">
        <div className="w-2/5">
          {locksGame.game.awayTeam.mascot} (
          {formatSpread(locksGame.homeSpread, false)})
        </div>
        <div className="text-center">vs.</div>
        <div className="w-2/5 text-right">
          {locksGame.game.homeTeam.mascot} (
          {formatSpread(locksGame.homeSpread, true)})
        </div>
      </div>
      {showSlider && (
        <>
          {/* <input
            type="range"
            min="-1"
            max="1"
            step="1"
            name={`${locksGame.id}-${pickedTeam?.id}`}
            defaultValue={pickSliderDefault}
            className="w-full"
            onChange={onPickChange}
          /> */}
          {
            <RadioGroup defaultValue="option-one">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option-one" id="option-one" />
              <Label htmlFor="option-one">Option One</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="option-two" id="option-two" />
              <Label htmlFor="option-two">Option Two</Label>
            </div>
          </RadioGroup>          
          }
          <div className="flex justify-between">
            <div>Current Pick: {pickedTeamDisplay !== "undefined" ? pickedTeamDisplay : "No Selection"}</div>
            <div>
              <Button type="button" onClick={resetPick}>
                Reset Pick
              </Button>
            </div>
          </div>
        </>
      )}
      {!showSlider && (
        <div className="text-center">
          <Button type="button" className="w-full" onClick={displayPickInput}>
            {pickSliderDefault !== 0 ? "Team has been picked" : "No team selected"}
          </Button>
        </div>
      )}
    </div>
  );
}
